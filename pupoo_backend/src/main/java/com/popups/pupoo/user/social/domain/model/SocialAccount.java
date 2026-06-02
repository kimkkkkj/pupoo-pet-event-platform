// file: src/main/java/com/popups/pupoo/user/social/domain/model/SocialAccount.java
package com.popups.pupoo.user.social.domain.model;

import com.popups.pupoo.user.social.domain.enums.SocialProvider;
import jakarta.persistence.*;

@Entity
@Table(
        name = "social_account",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_social_provider_uid", columnNames = {"provider", "provider_uid"}),
                @UniqueConstraint(name = "uk_social_user_provider", columnNames = {"user_id", "provider"})
        },
        indexes = {
                @Index(name = "ix_social_user_id", columnList = "user_id")
        }
)
public class SocialAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "social_id", nullable = false)
    private Long socialId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 100)
    private SocialProvider provider;

    @Column(name = "provider_uid", nullable = false, length = 255)
    private String providerUid;

    protected SocialAccount() {
    }

    public SocialAccount(Long userId, SocialProvider provider, String providerUid) {
        this.userId = userId;
        this.provider = provider;
        this.providerUid = providerUid;
    }

    public Long getSocialId() {
        return socialId;
    }

    public Long getUserId() {
        return userId;
    }

    public SocialProvider getProvider() {
        return provider;
    }

    public String getProviderUid() {
        return providerUid;
    }

    public void changeProviderUid(String providerUid) {
        this.providerUid = providerUid;
    }
}
