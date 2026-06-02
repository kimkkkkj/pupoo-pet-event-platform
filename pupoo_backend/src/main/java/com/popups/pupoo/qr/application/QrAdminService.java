// file: src/main/java/com/popups/pupoo/qr/application/QrAdminService.java
package com.popups.pupoo.qr.application;

import com.popups.pupoo.booth.domain.model.Booth;
import com.popups.pupoo.booth.persistence.BoothRepository;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.qr.domain.enums.QrCheckType;
import com.popups.pupoo.qr.domain.model.QrCheckin;
import com.popups.pupoo.qr.domain.model.QrCode;
import com.popups.pupoo.qr.dto.QrCheckinResponse;
import com.popups.pupoo.qr.persistence.QrCheckinRepository;
import com.popups.pupoo.qr.persistence.QrCodeRepository;
import com.popups.pupoo.event.domain.model.EventHistory;
import com.popups.pupoo.event.persistence.EventHistoryRepository;
import com.popups.pupoo.program.apply.domain.enums.ApplyStatus;
import com.popups.pupoo.program.apply.domain.model.ProgramApply;
import com.popups.pupoo.program.apply.domain.model.ProgramParticipationStat;
import com.popups.pupoo.program.apply.persistence.ProgramApplyRepository;
import com.popups.pupoo.program.apply.persistence.ProgramParticipationStatRepository;
import com.popups.pupoo.program.domain.model.Program;
import com.popups.pupoo.program.persistence.ProgramRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Objects;

@Service
@Transactional
public class QrAdminService {

    private final QrCodeRepository qrCodeRepository;
    private final QrCheckinRepository qrCheckinRepository;
    private final BoothRepository boothRepository;

    private final ProgramApplyRepository programApplyRepository;
    private final ProgramRepository programRepository;
    private final EventHistoryRepository eventHistoryRepository;
    private final ProgramParticipationStatRepository programParticipationStatRepository;

    public QrAdminService(QrCodeRepository qrCodeRepository,
                          QrCheckinRepository qrCheckinRepository,
                          BoothRepository boothRepository,
                          ProgramApplyRepository programApplyRepository,
                          ProgramRepository programRepository,
                          EventHistoryRepository eventHistoryRepository,
                          ProgramParticipationStatRepository programParticipationStatRepository) {
        this.qrCodeRepository = qrCodeRepository;
        this.qrCheckinRepository = qrCheckinRepository;
        this.boothRepository = boothRepository;
        this.programApplyRepository = programApplyRepository;
        this.programRepository = programRepository;
        this.eventHistoryRepository = eventHistoryRepository;
        this.programParticipationStatRepository = programParticipationStatRepository;
    }

    public QrCheckinResponse checkIn(Long eventId, Long boothId, Long qrId, Long programApplyId) {
        return process(eventId, boothId, qrId, QrCheckType.CHECKIN, programApplyId);
    }

    public QrCheckinResponse checkOut(Long eventId, Long boothId, Long qrId, Long programApplyId) {
        return process(eventId, boothId, qrId, QrCheckType.CHECKOUT, programApplyId);
    }

    private QrCheckinResponse process(Long eventId, Long boothId, Long qrId, QrCheckType type, Long programApplyId) {

        LocalDateTime now = LocalDateTime.now();

        // 1) QR 존재 + 이벤트 정합
        QrCode qr = qrCodeRepository.findById(qrId)
                .orElseThrow(() -> new IllegalArgumentException("QR_NOT_FOUND"));

        if (!Objects.equals(qr.getEvent().getEventId(), eventId)) {
            throw new IllegalArgumentException("QR_EVENT_MISMATCH");
        }

        // 2) 만료 체크
        if (qr.getExpiredAt() != null && qr.getExpiredAt().isBefore(now)) {
            throw new IllegalStateException("QR_EXPIRED");
        }

        // 3) 부스 존재 + 이벤트 정합
        Booth booth = boothRepository.findById(boothId)
                .orElseThrow(() -> new IllegalArgumentException("BOOTH_NOT_FOUND"));

        if (!Objects.equals(booth.getEventId(), eventId)) {
            throw new IllegalArgumentException("BOOTH_EVENT_MISMATCH");
        }

        // 4) 연속 동일 상태 방지(같은 booth에서 연속 CHECKIN/CHECKOUT)
        qrCheckinRepository.findTopByQrCode_QrIdAndBooth_BoothIdOrderByCheckedAtDesc(qrId, boothId)
        .ifPresentOrElse(last -> {

            // 1) CHECKIN 요청인데 직전이 CHECKIN이면 방지
            if (type == QrCheckType.CHECKIN && last.getCheckType() == QrCheckType.CHECKIN) {
                throw new IllegalStateException("ALREADY_CHECKED_IN");
            }

            // 2) CHECKOUT 요청인데 직전이 CHECKOUT이면 방지
            if (type == QrCheckType.CHECKOUT && last.getCheckType() == QrCheckType.CHECKOUT) {
                throw new IllegalStateException("ALREADY_CHECKED_OUT");
            }

            //  3) CHECKOUT은 직전이 반드시 CHECKIN이어야 함 (정책)
            if (type == QrCheckType.CHECKOUT && last.getCheckType() != QrCheckType.CHECKIN) {
                throw new IllegalStateException("CHECKOUT_REQUIRES_CHECKIN");
            }

        }, () -> {

            //  마지막 로그가 아예 없는데 CHECKOUT이면 불가 (정책)
            if (type == QrCheckType.CHECKOUT) {
                throw new IllegalStateException("CHECKOUT_REQUIRES_CHECKIN");
            }

            // 마지막 로그가 없고 CHECKIN이면 허용
        });


        // (선택) CHECKOUT 전에 CHECKIN 필수 정책 넣고 싶으면 여기서 last 상태 검사 추가

        // 5) 로그 저장
        QrCheckin log = QrCheckin.builder()
                .qrCode(qr)
                .booth(booth)
                .checkType(type)
                .checkedAt(now)
                .build();

        qrCheckinRepository.save(log);

        // 6) (선택) 프로그램 참여 확정
        // - 운영 QR 스캔 시 "티켓(program_apply_id)"를 함께 받으면, 참여 이력(event_history) + 집계(program_participation_stats) 갱신
        // - CHECKIN에서만 확정 처리한다.
        if (type == QrCheckType.CHECKIN && programApplyId != null) {
            confirmProgramParticipation(eventId, qr, programApplyId, now);
        }

        return QrCheckinResponse.builder()
                .qrId(qrId)
                .boothId(boothId)
                .checkType(type.name())
                .checkedAt(now)
                .build();
    }

    private void confirmProgramParticipation(Long eventId, QrCode qr, Long programApplyId, LocalDateTime now) {

        // 1) programApply 로드
        ProgramApply apply = programApplyRepository.findById(programApplyId)
                .orElseThrow(() -> new IllegalArgumentException("PROGRAM_APPLY_NOT_FOUND"));

        // 2) user 정합(해당 QR 소유자만 처리)
        if (!Objects.equals(apply.getUserId(), qr.getUser().getUserId())) {
            throw new IllegalArgumentException("PROGRAM_APPLY_USER_MISMATCH");
        }

        // 3) program/event 정합
        Program program = programRepository.findById(apply.getProgramId())
                .orElseThrow(() -> new IllegalArgumentException("PROGRAM_NOT_FOUND"));

        if (!Objects.equals(program.getEventId(), eventId)) {
            throw new IllegalArgumentException("PROGRAM_APPLY_EVENT_MISMATCH");
        }

        // 4) 상태 정책
        // - 참여 확정은 APPROVED 또는 WAITING(현장 확정)까지 허용
        if (program.getStartAt() != null && now.isBefore(program.getStartAt())) {
            throw new BusinessException(
                    ErrorCode.PROGRAM_APPLY_INVALID_STATUS,
                    "Program has not started yet"
            );
        }

        if (!(apply.getStatus() == ApplyStatus.APPROVED || apply.getStatus() == ApplyStatus.WAITING)) {
            throw new IllegalStateException("PROGRAM_APPLY_STATUS_NOT_CONFIRMABLE");
        }

        // 5) 참여 확정 처리 (티켓 재활용)
        // - CHECKED_IN으로 전환 + checked_in_at 기록
        apply.markCheckedIn(now);

        // 6) event_history 누적 기록 (중복/다회 참여 허용)
        EventHistory history = EventHistory.builder()
                .userId(apply.getUserId())
                .eventId(eventId)
                .programId(apply.getProgramId())
                .joinedAt(now)
                .build();
        eventHistoryRepository.save(history);

        // 7) 집계(upsert)
        // - user_id + program_id로 카운트를 유지
        ProgramParticipationStat stat = programParticipationStatRepository.findByUserIdAndProgramId(apply.getUserId(), apply.getProgramId())
                .orElseGet(() -> ProgramParticipationStat.create(apply.getUserId(), apply.getProgramId()));

        stat.increase(now);
        programParticipationStatRepository.save(stat);
    }
}
