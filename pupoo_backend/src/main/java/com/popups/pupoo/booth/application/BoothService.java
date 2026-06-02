// file: src/main/java/com/popups/pupoo/booth/application/BoothService.java
package com.popups.pupoo.booth.application;

import com.popups.pupoo.booth.domain.enums.BoothStatus;
import com.popups.pupoo.booth.domain.enums.BoothZone;
import com.popups.pupoo.booth.domain.model.Booth;
import com.popups.pupoo.booth.dto.BoothResponse;
import com.popups.pupoo.booth.dto.BoothWaitResponse;
import com.popups.pupoo.booth.persistence.BoothCongestionQueryRepository;
import com.popups.pupoo.booth.persistence.BoothRepository;
import com.popups.pupoo.booth.persistence.BoothWaitRepository;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class BoothService {

    private final BoothRepository boothRepository;
    private final BoothWaitRepository boothWaitRepository;
    private final BoothCongestionQueryRepository boothCongestionQueryRepository;

    public BoothService(
            BoothRepository boothRepository,
            BoothWaitRepository boothWaitRepository,
            BoothCongestionQueryRepository boothCongestionQueryRepository
    ) {
        this.boothRepository = boothRepository;
        this.boothWaitRepository = boothWaitRepository;
        this.boothCongestionQueryRepository = boothCongestionQueryRepository;
    }

    /** 행사 부스 목록 조회(상태/존 필터 + 페이징) */
    public Page<BoothResponse> getEventBooths(Long eventId, BoothZone zone, BoothStatus status, Pageable pageable) {
        return boothRepository.findEventBooths(eventId, zone, status, pageable)
                .map(BoothResponse::from);
    }

    /** 부스 상세 조회(대기/혼잡 포함) */
    public BoothResponse getBoothDetail(Long boothId) {
        Booth booth = boothRepository.findById(boothId)
                .orElseThrow(() -> new BusinessException(ErrorCode.BOOTH_NOT_FOUND));

        BoothResponse res = BoothResponse.from(booth);

        res.wait = boothWaitRepository.findByBoothId(boothId)
                .map(BoothWaitResponse::from)
                .orElse(null);

        res.congestion = boothCongestionQueryRepository.findLatestByBoothId(boothId)
                .orElse(null);

        return res;
    }
}
