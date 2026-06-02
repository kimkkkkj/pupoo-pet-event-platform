// file: src/main/java/com/popups/pupoo/qr/dto/QrCheckinResponse.java
package com.popups.pupoo.qr.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class QrCheckinResponse {
    private Long qrId;
    private Long boothId;
    private String checkType;
    private LocalDateTime checkedAt;
}
