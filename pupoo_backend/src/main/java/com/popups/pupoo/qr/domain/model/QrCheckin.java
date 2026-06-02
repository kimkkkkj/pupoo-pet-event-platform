// file: src/main/java/com/popups/pupoo/qr/domain/model/QrCheckin.java
package com.popups.pupoo.qr.domain.model;

import com.popups.pupoo.booth.domain.model.Booth;
import com.popups.pupoo.qr.domain.enums.QrCheckType;
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
    name = "qr_logs",
    indexes = {
        @Index(name = "ix_qr_logs_qr_id", columnList = "qr_id"),
        @Index(name = "ix_qr_logs_booth_id", columnList = "booth_id"),
        @Index(name = "ix_qr_logs_checked_at", columnList = "checked_at")
    }
)
public class QrCheckin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id", nullable = false)
    private Long logId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "qr_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_qr_logs_qr"))
    private QrCode qrCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booth_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_qr_logs_booth"))
    private Booth booth;

    /**
     * DB: ENUM('CHECKIN','CHECKOUT') NOT NULL
     * 목적: 출입 유형
     * 주의: ddl-auto=validate 환경에서 DB ENUM(Types#CHAR)과 엔티티 기대 타입을 일치시켜야 한다.
     */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(
        name = "check_type",
        nullable = false,
        columnDefinition = "ENUM('CHECKIN','CHECKOUT')"
    )
    private QrCheckType checkType;

    @Column(name = "checked_at", nullable = false)
    private LocalDateTime checkedAt;

    @PrePersist
    void prePersist() {
        if (checkedAt == null) {
            checkedAt = LocalDateTime.now();
        }
    }
}