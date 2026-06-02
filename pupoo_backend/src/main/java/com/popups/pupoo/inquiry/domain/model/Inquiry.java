// file: src/main/java/com/popups/pupoo/inquiry/domain/model/Inquiry.java
package com.popups.pupoo.inquiry.domain.model;

import com.popups.pupoo.inquiry.domain.enums.InquiryCategory;
import com.popups.pupoo.inquiry.domain.enums.InquiryStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "inquiries")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Inquiry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "inquiry_id", nullable = false)
    private Long inquiryId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, columnDefinition = "ENUM('EVENT','PAYMENT','REFUND','ACCOUNT','OTHER')")
    private InquiryCategory category;

    @Column(name = "inquiry_title", nullable = false, length = 255)
    private String inquiryTitle;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "ENUM('OPEN','IN_PROGRESS','CLOSED')")
    private InquiryStatus status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) this.createdAt = now;
        if (this.updatedAt == null) this.updatedAt = now;
        if (this.status == null) this.status = InquiryStatus.OPEN;
    }

    @PreUpdate
    void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void changeStatus(InquiryStatus status) {
        this.status = status;
    }

    public void update(String title, String content, InquiryCategory category) {
        this.inquiryTitle = title;
        this.content = content;
        this.category = category;
    }
}
