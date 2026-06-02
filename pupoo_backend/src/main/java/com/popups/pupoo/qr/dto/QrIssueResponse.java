// file: src/main/java/com/popups/pupoo/qr/dto/QrIssueResponse.java
package com.popups.pupoo.qr.dto;

import com.popups.pupoo.qr.domain.model.QrCode;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class QrIssueResponse {
    private Long qrId;
    private Long eventId;
    private String originalUrl;
    private String mimeType;
    private LocalDateTime issuedAt;
    private LocalDateTime expiredAt;

    public static QrIssueResponse from(QrCode qr) {
        return QrIssueResponse.builder()
                .qrId(qr.getQrId())
                .eventId(qr.getEvent().getEventId())
                .originalUrl(qr.getOriginalUrl())
                .mimeType(qr.getMimeType() == null ? null : qr.getMimeType().name())
                .issuedAt(qr.getIssuedAt())
                .expiredAt(qr.getExpiredAt())
                .build();
    }
}
