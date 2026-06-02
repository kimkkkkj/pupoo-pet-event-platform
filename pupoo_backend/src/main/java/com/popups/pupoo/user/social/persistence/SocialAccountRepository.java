// file: src/main/java/com/popups/pupoo/user/social/persistence/SocialAccountRepository.java
package com.popups.pupoo.user.social.persistence;

import com.popups.pupoo.user.social.domain.enums.SocialProvider;
import com.popups.pupoo.user.social.domain.model.SocialAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SocialAccountRepository extends JpaRepository<SocialAccount, Long> {

    Optional<SocialAccount> findBySocialIdAndUserId(Long socialId, Long userId);

    boolean existsByUserIdAndProvider(Long userId, SocialProvider provider);

    Optional<SocialAccount> findByProviderAndProviderUid(SocialProvider provider, String providerUid);

    Optional<SocialAccount> findByUserIdAndProvider(Long userId, SocialProvider provider);

    List<SocialAccount> findAllByUserId(Long userId);
}
