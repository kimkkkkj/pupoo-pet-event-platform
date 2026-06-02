// file: src/main/java/com/popups/pupoo/interest/domain/model/UserInterestSubscription.java
package com.popups.pupoo.interest.domain.model;

import com.popups.pupoo.interest.domain.enums.SubscriptionStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import static lombok.AccessLevel.PROTECTED;

/**
 * UserInterestSubscription
 *
 * [DB: user_interest_subscriptions]
 * - allow_inapp TINYINT(1)
 * - allow_email TINYINT(1)
 * - allow_sms TINYINT(1)
 * - status ENUM('ACTIVE','PAUSED','CANCELLED')
 * - created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(
        name = "user_interest_subscriptions",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_user_interest_subscriptions_user_interest",
                        columnNames = {"user_id", "interest_id"}
                )
        }
)
public class UserInterestSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "subscription_id", nullable = false)
    private Long subscriptionId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "interest_id", nullable = false)
    private Interest interest;

    /**
     * TINYINT(1) ↔ boolean 매핑 명시
     */
    @Column(name = "allow_inapp", nullable = false, columnDefinition = "TINYINT(1)")
    private boolean allowInapp;

    @Column(name = "allow_email", nullable = false, columnDefinition = "TINYINT(1)")
    private boolean allowEmail;

    @Column(name = "allow_sms", nullable = false, columnDefinition = "TINYINT(1)")
    private boolean allowSms;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private SubscriptionStatus status;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public static UserInterestSubscription create(Long userId,
                                                  Interest interest,
                                                  boolean allowInapp,
                                                  boolean allowEmail,
                                                  boolean allowSms) {
        UserInterestSubscription s = new UserInterestSubscription();
        s.userId = userId;
        s.interest = interest;
        s.allowInapp = allowInapp;
        s.allowEmail = allowEmail;
        s.allowSms = allowSms;
        s.status = SubscriptionStatus.ACTIVE;
        return s;
    }

    public void activate(boolean allowInapp, boolean allowEmail, boolean allowSms) {
        this.status = SubscriptionStatus.ACTIVE;
        this.allowInapp = allowInapp;
        this.allowEmail = allowEmail;
        this.allowSms = allowSms;
    }

    public void pause() {
        this.status = SubscriptionStatus.PAUSED;
    }

    public void cancel() {
        this.status = SubscriptionStatus.CANCELLED;
    }

    public void updateChannels(boolean allowInapp, boolean allowEmail, boolean allowSms) {
        this.allowInapp = allowInapp;
        this.allowEmail = allowEmail;
        this.allowSms = allowSms;
    }
}
