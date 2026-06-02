// file: src/main/java/com/popups/pupoo/adminlog/domain/model/AdminLog.java
package com.popups.pupoo.common.audit.domain.model;

import com.popups.pupoo.common.audit.domain.enums.AdminLogResult;
import com.popups.pupoo.common.audit.domain.enums.AdminTargetType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 관리자 작업 로그 엔티티.
 * 목적: 운영 감사/장애 대응을 위해 관리자 쓰기 작업을 기록한다.
 */
@Entity
@Table(name = "admin_logs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class AdminLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id", nullable = false)
    private Long logId;

    @Column(name = "admin_id", nullable = false)
    private Long adminId;

    @Column(name = "action", nullable = false, length = 255)
    private String action;

    @Enumerated(EnumType.STRING)
    @Column(name = "result", nullable = false, columnDefinition = "ENUM('SUCCESS','FAIL')")
    private AdminLogResult result;

    @Column(name = "error_code", length = 50)
    private String errorCode;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Enumerated(EnumType.STRING)
    @Column(
            name = "target_type",
            columnDefinition = "ENUM('USER','EVENT','PROGRAM','BOOTH','NOTICE','PAYMENT','REFUND','REVIEW','POST','QNA','INQUIRY','GALLERY','QR','SYSTEM','OTHER')"
    )
    private AdminTargetType targetType;

    @Column(name = "target_id")
    private Long targetId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
