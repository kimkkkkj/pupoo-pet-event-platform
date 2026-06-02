// file: src/main/java/com/popups/pupoo/auth/persistence/SignupSessionRepository.java
package com.popups.pupoo.auth.persistence;

import com.popups.pupoo.auth.domain.model.SignupSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * 회원가입 세션 Repository
 */
public interface SignupSessionRepository extends JpaRepository<SignupSession, Long> {

    Optional<SignupSession> findBySignupKey(String signupKey);

    Optional<SignupSession> findTopByPhoneAndOtpLastSentAtIsNotNullOrderByOtpLastSentAtDesc(String phone);

    long countByPhoneAndOtpLastSentAtAfter(String phone, LocalDateTime after);
}
