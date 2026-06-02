// file: src/main/java/com/popups/pupoo/user/persistence/UserRepository.java
package com.popups.pupoo.user.persistence;

import com.popups.pupoo.user.domain.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * User Repository
 * - 로그인, 중복 체크, 관리자 검색에 사용한다.
 */
public interface UserRepository extends JpaRepository<User, Long> {

    @Query("select u.userId from User u where u.status = com.popups.pupoo.user.domain.enums.UserStatus.ACTIVE")
    List<Long> findActiveUserIds();

    Optional<User> findByEmail(String email);

    boolean existsByNickname(String nickname);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    @Query(value = """
            select count(*)
              from users u
             where replace(replace(replace(u.phone, '-', ''), ' ', ''), '+', '') in (:normalizedPhone, :alternatePhone)
            """, nativeQuery = true)
    long countByNormalizedPhoneVariants(@Param("normalizedPhone") String normalizedPhone,
                                        @Param("alternatePhone") String alternatePhone);

    @Query("select u.showPet from User u where u.userId = :userId")
    Boolean findShowPetByUserId(@Param("userId") Long userId);

    @Query("""
            select u
              from User u
             where (:status is null or u.status = :status)
               and (
                    :keyword is null
                    or u.email like concat('%', :keyword, '%')
                    or u.nickname like concat('%', :keyword, '%')
                    or u.phone like concat('%', :keyword, '%')
               )
            """)
    Page<User> search(@Param("status") com.popups.pupoo.user.domain.enums.UserStatus status,
                      @Param("keyword") String keyword,
                      Pageable pageable);

    @Query(value = """
            select distinct u.email
              from users u
              join notification_settings ns
                on ns.user_id = u.user_id
               and ns.allow_marketing = 1
              join user_interest_subscriptions s
                on s.user_id = u.user_id
               and s.status = 'ACTIVE'
               and s.allow_email = 1
              join event_interest_map eim
                on eim.interest_id = s.interest_id
               and eim.event_id = :eventId
             where u.status = 'ACTIVE'
            """, nativeQuery = true)
    List<String> findDistinctMarketingEmailsForEventInterest(@Param("eventId") Long eventId);

    @Query(value = """
            select distinct u.phone
              from users u
              join notification_settings ns
                on ns.user_id = u.user_id
               and ns.allow_marketing = 1
              join user_interest_subscriptions s
                on s.user_id = u.user_id
               and s.status = 'ACTIVE'
               and s.allow_sms = 1
              join event_interest_map eim
                on eim.interest_id = s.interest_id
               and eim.event_id = :eventId
             where u.status = 'ACTIVE'
            """, nativeQuery = true)
    List<String> findDistinctMarketingPhonesForEventInterest(@Param("eventId") Long eventId);

    @Query(value = """
            select distinct u.email
              from users u
              join notification_settings ns
                on ns.user_id = u.user_id
               and ns.allow_marketing = 1
              join event_apply ea
                on ea.user_id = u.user_id
               and ea.event_id = :eventId
               and ea.status = 'APPROVED'
             where u.status = 'ACTIVE'
            """, nativeQuery = true)
    List<String> findDistinctMarketingEmailsForEventRegistrants(@Param("eventId") Long eventId);

    @Query(value = """
            select distinct u.phone
              from users u
              join notification_settings ns
                on ns.user_id = u.user_id
               and ns.allow_marketing = 1
              join event_apply ea
                on ea.user_id = u.user_id
               and ea.event_id = :eventId
               and ea.status = 'APPROVED'
             where u.status = 'ACTIVE'
            """, nativeQuery = true)
    List<String> findDistinctMarketingPhonesForEventRegistrants(@Param("eventId") Long eventId);

    @Query(value = """
            select distinct u.email
              from users u
              join notification_settings ns
                on ns.user_id = u.user_id
               and ns.allow_marketing = 1
              join payments p
                on p.user_id = u.user_id
               and p.event_id = :eventId
               and p.status = 'APPROVED'
             where u.status = 'ACTIVE'
            """, nativeQuery = true)
    List<String> findDistinctMarketingEmailsForEventPayers(@Param("eventId") Long eventId);

    @Query(value = """
            select distinct u.phone
              from users u
              join notification_settings ns
                on ns.user_id = u.user_id
               and ns.allow_marketing = 1
              join payments p
                on p.user_id = u.user_id
               and p.event_id = :eventId
               and p.status = 'APPROVED'
             where u.status = 'ACTIVE'
            """, nativeQuery = true)
    List<String> findDistinctMarketingPhonesForEventPayers(@Param("eventId") Long eventId);
}
