// file: src/main/java/com/popups/pupoo/interest/application/InterestService.java
package com.popups.pupoo.interest.application;

import com.popups.pupoo.auth.security.util.SecurityUtil;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.interest.domain.enums.InterestType;
import com.popups.pupoo.interest.domain.enums.SubscriptionStatus;
import com.popups.pupoo.interest.domain.model.Interest;
import com.popups.pupoo.interest.domain.model.UserInterestSubscription;
import com.popups.pupoo.interest.dto.*;
import com.popups.pupoo.interest.persistence.InterestRepository;
import com.popups.pupoo.interest.persistence.UserInterestSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@RequiredArgsConstructor
@Service
public class InterestService {

    private final InterestRepository interestRepository;
    private final UserInterestSubscriptionRepository subscriptionRepository;
    private final SecurityUtil securityUtil;   // ⭐ DI 주입

    /**
     * 관심사 목록 조회
     */
    @Transactional(readOnly = true)
    public List<InterestResponse> getAll(InterestType type) {

        Sort sort = Sort.by(
                Sort.Order.asc("type"),
                Sort.Order.asc("interestName")
        );

        List<Interest> interests = (type == null)
                ? interestRepository.findAllByIsActiveTrue(sort)
                : interestRepository.findAllByTypeAndIsActiveTrue(type, sort);

        return interests.stream()
                .map(InterestResponse::from)
                .toList();
    }

    /**
     * 관심사 구독
     */
    @Transactional
    public UserInterestSubscriptionResponse subscribe(InterestSubscribeRequest request) {

        Long userId = securityUtil.currentUserId();   // ⭐ 통일된 방식

        Interest interest = interestRepository.findById(request.getInterestId())
                .orElseThrow(() ->
                        new BusinessException(ErrorCode.INVALID_REQUEST, "Interest not found")
                );

        return subscriptionRepository
                .findByUserIdAndInterest_InterestId(userId, interest.getInterestId())
                .map(existing -> {

                    if (existing.getStatus() == SubscriptionStatus.ACTIVE) {
                        throw new BusinessException(
                                ErrorCode.INVALID_REQUEST,
                                "Already subscribed"
                        );
                    }

                    existing.activate(
                            request.allowInappValue(),
                            request.allowEmailValue(),
                            request.allowSmsValue()
                    );

                    return UserInterestSubscriptionResponse.from(existing);
                })
                .orElseGet(() -> {
                    try {
                        UserInterestSubscription created =
                                UserInterestSubscription.create(
                                        userId,
                                        interest,
                                        request.allowInappValue(),
                                        request.allowEmailValue(),
                                        request.allowSmsValue()
                                );

                        return UserInterestSubscriptionResponse.from(
                                subscriptionRepository.save(created)
                        );

                    } catch (DataIntegrityViolationException e) {
                        throw new BusinessException(
                                ErrorCode.INVALID_REQUEST,
                                "Duplicate subscription"
                        );
                    }
                });
    }

    /**
     * 관심사 구독 해제 (CANCELLED)
     */
    @Transactional
    public UserInterestSubscriptionResponse unsubscribe(InterestUnsubscribeRequest request) {

        Long userId = securityUtil.currentUserId();   // ⭐ 통일

        UserInterestSubscription subscription =
                subscriptionRepository
                        .findByUserIdAndInterest_InterestId(userId, request.getInterestId())
                        .orElseThrow(() ->
                                new BusinessException(ErrorCode.INVALID_REQUEST, "Subscription not found")
                        );

        subscription.cancel();

        return UserInterestSubscriptionResponse.from(subscription);
    }

    /**
     * 내 구독 목록 조회
     */
    @Transactional
    public UserInterestSubscriptionResponse updateChannels(InterestChannelUpdateRequest request) {

        Long userId = securityUtil.currentUserId();

        UserInterestSubscription subscription = subscriptionRepository
                .findByUserIdAndInterest_InterestId(userId, request.getInterestId())
                .orElseThrow(() ->
                        new BusinessException(ErrorCode.INVALID_REQUEST, "Subscription not found")
                );

        if (subscription.getStatus() != SubscriptionStatus.ACTIVE) {
            throw new BusinessException(
                    ErrorCode.INVALID_REQUEST,
                    "Only active subscriptions can update channels"
            );
        }

        subscription.updateChannels(
                request.allowInappValue(),
                request.allowEmailValue(),
                request.allowSmsValue()
        );

        return UserInterestSubscriptionResponse.from(subscription);
    }

    @Transactional(readOnly = true)
    public List<UserInterestSubscriptionResponse> mySubscriptions(boolean includeInactive) {

        Long userId = securityUtil.currentUserId();   // ⭐ 통일

        List<UserInterestSubscription> list = includeInactive
                ? subscriptionRepository.findAllByUserIdOrderByCreatedAtDesc(userId)
                : subscriptionRepository.findAllByUserIdAndStatusOrderByCreatedAtDesc(
                        userId,
                        SubscriptionStatus.ACTIVE
                );

        return list.stream()
                .map(UserInterestSubscriptionResponse::from)
                .toList();
    }
}
