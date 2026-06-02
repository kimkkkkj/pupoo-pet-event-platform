// file: src/main/java/com/popups/pupoo/qr/application/QrService.java
package com.popups.pupoo.qr.application;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.popups.pupoo.booth.domain.model.Booth;
import com.popups.pupoo.booth.persistence.BoothRepository;
import com.popups.pupoo.event.domain.model.Event;
import com.popups.pupoo.event.persistence.EventRepository;
import com.popups.pupoo.qr.domain.enums.QrMimeType;
import com.popups.pupoo.qr.domain.model.QrCheckin;
import com.popups.pupoo.qr.domain.model.QrCode;
import com.popups.pupoo.qr.dto.QrHistoryResponse;
import com.popups.pupoo.qr.dto.QrIssueResponse;
import com.popups.pupoo.qr.persistence.QrCheckinRepository;
import com.popups.pupoo.qr.persistence.projection.BoothVisitSummaryRow;
import com.popups.pupoo.qr.persistence.QrCodeRepository;
import com.popups.pupoo.user.domain.model.User;
import com.popups.pupoo.user.persistence.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@Transactional(readOnly = true)
/**
 * 기능: QR 발급, 이미지 생성, 방문 이력 집계를 담당한다.
 * 설명: controller에서 전달된 사용자와 이벤트 정보를 바탕으로 QR 데이터와 방문 로그를 조합한다.
 * 흐름: 사용자/이벤트 검증 -> repository 조회 및 생성 -> DTO 변환 순서로 처리한다.
 */
// 기능: QR 발급, 이미지 생성, 방문 이력 집계를 담당한다.
// 설명: 사용자와 이벤트 정보를 바탕으로 QR 데이터와 방문 로그를 조합한다.
// 흐름: 사용자/이벤트 검증 -> repository 조회 및 생성 -> DTO 변환.
public class QrService {
    private static final int QR_IMAGE_SIZE = 512;

    private final QrCodeRepository qrCodeRepository;
    private final QrCheckinRepository qrCheckinRepository;

    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final BoothRepository boothRepository;

    public QrService(QrCodeRepository qrCodeRepository,
                     QrCheckinRepository qrCheckinRepository,
                     UserRepository userRepository,
                     EventRepository eventRepository,
                     BoothRepository boothRepository) {
        this.qrCodeRepository = qrCodeRepository;
        this.qrCheckinRepository = qrCheckinRepository;
        this.userRepository = userRepository;
        this.eventRepository = eventRepository;
        this.boothRepository = boothRepository;
    }

    // =========================
    // 1) 내 QR 조회/발급
    // =========================
    /**
     * 기능: 사용자와 이벤트 기준 QR을 조회하거나 신규 발급한다.
     * 설명: 유효한 QR이 있으면 그대로 반환하고, 없으면 만료일을 계산해 새 QR을 저장한다.
     * 흐름: 사용자 조회 -> 이벤트 조회 -> 기존 QR 탐색 -> 없으면 생성 후 반환.
     */
    @Transactional
    // 기능: 사용자와 이벤트 기준 QR을 조회하거나 신규 발급한다.
    // 설명: 유효한 QR이 있으면 그대로 반환하고, 없으면 만료일을 계산해 새 QR을 저장한다.
    // 흐름: 사용자 조회 -> 이벤트 조회 -> 기존 QR 탐색 -> 없으면 생성 후 반환.
    public QrIssueResponse getMyQrOrIssue(Long userId, Long eventId) {
        LocalDateTime now = LocalDateTime.now();

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자 없음"));

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("행사 없음"));

        return qrCodeRepository.findLatest(userId, eventId)
                .map(QrIssueResponse::from)
                .orElseGet(() -> {
                    LocalDateTime expiredAt = event.getEndAt().plusDays(1);

                    QrCode issued = QrCode.builder()
                            .user(user)
                            .event(event)
                            .originalUrl(buildQrUrl(userId, eventId))
                            // enum 상수는 대문자, DB 저장은 Converter가 소문자로 변환한다.
                            .mimeType(QrMimeType.PNG)
                            .issuedAt(now)
                            .expiredAt(expiredAt)
                            .build();

                    try {
                        QrCode saved = qrCodeRepository.save(issued);
                        return QrIssueResponse.from(saved);
                    } catch (DataIntegrityViolationException e) {
                        return qrCodeRepository.findLatest(userId, eventId)
                                .map(QrIssueResponse::from)
                                .orElseThrow(() -> e);
                    }
                });
    }

    /**
     * 기능: QR 원본 URL을 생성한다.
     * 설명: 사용자와 이벤트 조합으로 고유한 QR 경로를 만든다.
     * 흐름: userId/eventId 조합 -> 서비스 도메인 URL 문자열 반환.
     */
    private String buildQrUrl(Long userId, Long eventId) {
        return "https://pupoo.io/qr/" + userId + "/" + eventId;
    }

    /**
     * 기능: 사용자 QR을 PNG 파일로 내려주기 위한 데이터로 변환한다.
     * 설명: QR 원본 URL을 이미지 바이트로 생성하고 파일명과 content type을 함께 묶는다.
     * 흐름: QR 확보 -> 원본 URL 검증 -> PNG 생성 -> 다운로드 DTO 반환.
     */
    // 기능: 사용자 QR을 다운로드용 데이터로 변환한다.
    // 설명: QR 원본 URL을 이미지 바이트로 생성하고 파일명과 content type을 함께 묶는다.
    // 흐름: QR 확보 -> 원본 URL 검증 -> PNG 생성 -> 다운로드 DTO 반환.
    public QrDownloadResult downloadMyQr(Long userId, Long eventId) {
        QrIssueResponse qr = getMyQrOrIssue(userId, eventId);
        String originalUrl = qr.getOriginalUrl();
        if (originalUrl == null || originalUrl.isBlank()) {
            throw new IllegalStateException("QR image url is empty");
        }
        try {
            byte[] body = generateQrPng(originalUrl);
            String filename = "qr-" + qr.getQrId() + ".png";
            return new QrDownloadResult(body, "image/png", filename);
        } catch (WriterException | IOException e) {
            throw new IllegalStateException("QR image generation failed", e);
        }
    }

    /**
     * 기능: QR 텍스트를 PNG 바이트 배열로 변환한다.
     * 설명: ZXing을 사용해 화면 및 다운로드에 공통으로 사용할 이미지를 생성한다.
     * 흐름: 힌트 설정 -> 비트맵 생성 -> PNG stream 변환.
     */
    private byte[] generateQrPng(String content) throws WriterException, IOException {
        Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
        hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
        hints.put(EncodeHintType.MARGIN, 1);

        QRCodeWriter writer = new QRCodeWriter();
        BitMatrix matrix = writer.encode(
                content,
                BarcodeFormat.QR_CODE,
                QR_IMAGE_SIZE,
                QR_IMAGE_SIZE,
                hints
        );

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            MatrixToImageWriter.writeToStream(matrix, "PNG", out);
            return out.toByteArray();
        }
    }

    public record QrDownloadResult(byte[] bytes, String contentType, String filename) {
    }

    // =========================
    // 2) 내 부스 방문 목록 (이벤트별 그룹)
    // =========================
    /**
     * 기능: 전체 이벤트 기준 사용자 방문 요약을 묶어서 반환한다.
     * 설명: repository 결과를 이벤트 단위 그룹으로 재구성한다.
     * 흐름: 방문 요약 조회 -> 이벤트별 그룹화 -> DTO 목록 반환.
     */
    // 기능: 전체 이벤트 기준 사용자 방문 요약을 반환한다.
    // 설명: repository 결과를 이벤트 단위 그룹으로 재구성한다.
    // 흐름: 방문 요약 조회 -> 이벤트별 그룹화 -> DTO 목록 반환.
    public List<QrHistoryResponse.EventBoothVisits> getMyBoothVisitsGroupedByEvent(Long userId) {
        List<BoothVisitSummaryRow> rows = qrCheckinRepository.findMyBoothVisitSummaryRows(userId, null);
        return toEventGroups(rows);
    }

    // 2-1) 내 부스 방문 목록 (특정 이벤트 1개) - eventName 포함
    /**
     * 기능: 특정 이벤트의 사용자 방문 요약을 반환한다.
     * 설명: 조회 결과가 없더라도 빈 구조를 반환해 프론트가 일관된 형태로 처리하도록 한다.
     * 흐름: 이벤트 필터 조회 -> 그룹 변환 -> 첫 결과 또는 빈 DTO 반환.
     */
    public QrHistoryResponse.EventBoothVisits getMyBoothVisitsEvent(Long userId, Long eventId) {
        List<BoothVisitSummaryRow> rows = qrCheckinRepository.findMyBoothVisitSummaryRows(userId, eventId);
        List<QrHistoryResponse.EventBoothVisits> grouped = toEventGroups(rows);

        if (grouped.isEmpty()) {
            return QrHistoryResponse.EventBoothVisits.builder()
                    .eventId(eventId)
                    .eventName(null)
                    .booths(List.of())
                    .build();
        }
        return grouped.get(0);
    }

    private List<QrHistoryResponse.EventBoothVisits> toEventGroups(List<BoothVisitSummaryRow> rows) {
        if (rows == null || rows.isEmpty()) return List.of();

        Map<Long, QrHistoryResponse.EventBoothVisits> grouped = new LinkedHashMap<>();

        for (BoothVisitSummaryRow r : rows) {
            Long eventId = r.getEventId();

            QrHistoryResponse.EventBoothVisits group = grouped.computeIfAbsent(eventId, id ->
                    QrHistoryResponse.EventBoothVisits.builder()
                            .eventId(id)
                            .eventName(r.getEventName())
                            .booths(new ArrayList<>())
                            .build()
            );

            group.getBooths().add(mapToSummary(r));
        }

        return new ArrayList<>(grouped.values());
    }

    private QrHistoryResponse.BoothVisitSummary mapToSummary(BoothVisitSummaryRow r) {
        return QrHistoryResponse.BoothVisitSummary.builder()
                .boothId(r.getBoothId())
                .placeName(r.getPlaceName())
                .zone(r.getZone())
                .type(r.getType())
                .status(r.getStatus())
                .company(r.getCompany())
                .description(r.getDescription())
                .visitCount(r.getVisitCount() == null ? 0 : r.getVisitCount())
                .lastVisitedAt(toLocalDateTime(r.getLastVisitedAt()))
                .lastCheckType(r.getLastCheckType())
                .build();
    }

    private LocalDateTime toLocalDateTime(Timestamp ts) {
        return (ts == null) ? null : ts.toLocalDateTime();
    }

    // =========================
    // 3) 내 부스 방문 로그
    // =========================
    /**
     * 기능: 특정 부스의 사용자 방문 로그를 반환한다.
     * 설명: 부스가 해당 이벤트 소속인지 검증한 뒤 체크인 로그를 DTO로 변환한다.
     * 흐름: 부스 조회 및 이벤트 검증 -> 로그 조회 -> VisitLog 목록 변환.
     */
    public List<QrHistoryResponse.VisitLog> getMyBoothVisitLogs(Long userId, Long eventId, Long boothId) {

        Booth booth = boothRepository.findById(boothId)
                .orElseThrow(() -> new IllegalArgumentException("부스 없음"));

        // Booth는 eventId(Long) 구조이므로 이걸로 검증
        if (!Objects.equals(booth.getEventId(), eventId)) {
            throw new IllegalArgumentException("부스가 해당 행사 소속이 아님");
        }

        List<QrCheckin> logs = qrCheckinRepository.findMyLogsByBooth(userId, eventId, boothId);

        return logs.stream()
                .map(l -> QrHistoryResponse.VisitLog.builder()
                        .logId(l.getLogId())
                        .checkType(l.getCheckType().name())
                        .checkedAt(l.getCheckedAt())
                        .build())
                .toList();
    }
}
