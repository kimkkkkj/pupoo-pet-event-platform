// file: src/main/java/com/popups/pupoo/interest/persistence/UserInterestSubscriptionRepository.java
package com.popups.pupoo.interest.persistence;

import com.popups.pupoo.interest.domain.enums.SubscriptionStatus;
import com.popups.pupoo.interest.domain.model.UserInterestSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserInterestSubscriptionRepository extends JpaRepository<UserInterestSubscription, Long> {

    /**
     * (user_id, interest_id) 유니크 기반 조회
     */
    Optional<UserInterestSubscription> findByUserIdAndInterest_InterestId(Long userId, Long interestId);

    /**
     * 내 구독 전체 조회(상태 포함)
     * - created_at 기준 최신이 맨 위 (updated_at 없으므로 created_at 기준)
     */
    List<UserInterestSubscription> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * 내 구독 중 특정 상태만
     */
    List<UserInterestSubscription> findAllByUserIdAndStatusOrderByCreatedAtDesc(Long userId, SubscriptionStatus status);
}
