// file: src/main/java/com/popups/pupoo/booth/dto/BoothWaitResponse.java
package com.popups.pupoo.booth.dto;

import com.popups.pupoo.booth.domain.model.BoothWait;

import java.time.LocalDateTime;

public class BoothWaitResponse {
    public Integer waitCount;
    public Integer waitMin;
    public LocalDateTime updatedAt;

    public static BoothWaitResponse from(BoothWait w) {
        BoothWaitResponse r = new BoothWaitResponse();
        r.waitCount = w.getWaitCount();
        r.waitMin = w.getWaitMin();
        r.updatedAt = w.getUpdatedAt();
        return r;
    }
}
