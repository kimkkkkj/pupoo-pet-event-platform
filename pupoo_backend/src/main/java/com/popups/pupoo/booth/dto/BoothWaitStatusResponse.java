// file: src/main/java/com/popups/pupoo/booth/dto/BoothWaitStatusResponse.java
package com.popups.pupoo.booth.dto;

import com.popups.pupoo.booth.domain.model.BoothWait;

import java.time.LocalDateTime;

/**
 * 부스 대기 현황 응답 DTO (운영/관리자용)
 */
public class BoothWaitStatusResponse {

    public Long boothId;
    public Integer waitCount;
    public Integer waitMin;
    public LocalDateTime updatedAt;

    public static BoothWaitStatusResponse from(BoothWait w) {
        BoothWaitStatusResponse r = new BoothWaitStatusResponse();
        r.boothId = w.getBoothId();
        r.waitCount = w.getWaitCount();
        r.waitMin = w.getWaitMin();
        r.updatedAt = w.getUpdatedAt();
        return r;
    }
}
