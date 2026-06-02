// file: src/main/java/com/popups/pupoo/qr/domain/model/QrCode.java
package com.popups.pupoo.qr.domain.model;

import com.popups.pupoo.event.domain.model.Event;
import com.popups.pupoo.qr.domain.enums.QrMimeType;
import com.popups.pupoo.qr.domain.enums.QrMimeTypeConverter;
import com.popups.pupoo.user.domain.model.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(
    name = "qr_codes",
    indexes = {
        @Index(name = "ix_qr_codes_user_id", columnList = "user_id"),
        @Index(name = "ix_qr_codes_event_id", columnList = "event_id")
    }
)
public class QrCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "qr_id", nullable = false)
    private Long qrId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "user_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_qr_codes_users")
    )
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "event_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_qr_codes_event")
    )
    private Event event;

    // Note: this original_url is the QR payload URL, not an object storage key.
    @Column(name = "original_url", nullable = false, length = 500)
    private String originalUrl;

    /**
     * DB: ENUM('jpeg','jpg','png','gif','webp','tiff','svg') NULL
     * 목적: QR 이미지 MIME 타입(확장자)
     * 주의: ddl-auto=validate 환경에서 DB ENUM(Types#CHAR)과 엔티티 기대 타입을 일치시켜야 한다.
     */
    @Convert(converter = QrMimeTypeConverter.class)
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(
        name = "mime_type",
        nullable = true,
        columnDefinition = "ENUM('jpeg','jpg','png','gif','webp','tiff','svg')"
    )
    private QrMimeType mimeType;

    @Column(name = "issued_at", nullable = false)
    private LocalDateTime issuedAt;

    @Column(name = "expired_at", nullable = false)
    private LocalDateTime expiredAt;

    @PrePersist
    void prePersist() {
        if (issuedAt == null) {
            issuedAt = LocalDateTime.now();
        }
    }
}
