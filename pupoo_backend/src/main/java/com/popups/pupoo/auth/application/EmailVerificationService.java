// file: src/main/java/com/popups/pupoo/auth/application/EmailVerificationService.java
package com.popups.pupoo.auth.application;

import com.popups.pupoo.auth.domain.model.EmailVerificationToken;
import com.popups.pupoo.auth.dto.EmailChangeRequest;
import com.popups.pupoo.auth.dto.EmailVerificationRequestResponse;
import com.popups.pupoo.auth.persistence.EmailVerificationTokenRepository;
import com.popups.pupoo.auth.port.EmailVerificationSenderPort;
import com.popups.pupoo.auth.support.VerificationHashSupport;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.user.domain.model.User;
import com.popups.pupoo.user.persistence.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

/**
 * 계정 이메일 인증과 이메일 변경 인증을 전담한다.
 * 이메일 발송은 Port로 분리하고, 토큰 저장과 검증 정책은 이 서비스가 직접 관리한다.
 */
@Service
public class EmailVerificationService {

    private final UserRepository userRepository;
    private final EmailVerificationTokenRepository tokenRepository;
    private final EmailVerificationSenderPort emailVerificationSenderPort;
    private final VerificationHashSupport verificationHashSupport;
    private final int tokenTtlHours;
    private final int requestCooldownSeconds;
    private final boolean exposeDevToken;

    public EmailVerificationService(
            UserRepository userRepository,
            EmailVerificationTokenRepository tokenRepository,
            EmailVerificationSenderPort emailVerificationSenderPort,
            VerificationHashSupport verificationHashSupport,
            @Value("${verification.email.ttl-hours:24}") int tokenTtlHours,
            @Value("${verification.request.cooldown-seconds:60}") int requestCooldownSeconds,
            @Value("${verification.dev.expose:true}") boolean exposeDevToken
    ) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.emailVerificationSenderPort = emailVerificationSenderPort;
        this.verificationHashSupport = verificationHashSupport;
        this.tokenTtlHours = tokenTtlHours;
        this.requestCooldownSeconds = requestCooldownSeconds;
        this.exposeDevToken = exposeDevToken;
    }

    /**
     * 계정 이메일 인증 링크용 토큰을 발급한다.
     * 이미 인증된 계정은 차단하고, 최근 요청이 있으면 쿨다운 정책으로 재발급을 제한한다.
     */
    @Transactional
    public EmailVerificationRequestResponse requestEmailVerification(Long userId) {
        validateHashSalt();

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_PROFILE_NOT_FOUND));

        if (user.isEmailVerified()) {
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_VERIFIED);
        }

        tokenRepository.findTopByUserIdAndUsedAtIsNullOrderByCreatedAtDesc(userId).ifPresent(latest -> {
            LocalDateTime cooldownLimit = latest.getCreatedAt().plusSeconds(requestCooldownSeconds);
            if (LocalDateTime.now().isBefore(cooldownLimit)) {
                throw new BusinessException(ErrorCode.VERIFICATION_TOO_MANY_REQUESTS);
            }
        });

        String token = UUID.randomUUID().toString().replace("-", "");
        String tokenHash = verificationHashSupport.hashWithCurrentSalt(token);
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(tokenTtlHours);

        tokenRepository.save(new EmailVerificationToken(userId, tokenHash, expiresAt));
        emailVerificationSenderPort.sendAccountVerificationEmail(user.getEmail(), token);

        return new EmailVerificationRequestResponse(expiresAt, exposeDevToken ? token : null);
    }

    /**
     * 이메일 변경용 인증 토큰을 새 이메일로 보낸다.
     * 현재 이메일과 같거나 이미 다른 계정이 사용 중인 이메일은 허용하지 않는다.
     */
    @Transactional
    public EmailVerificationRequestResponse requestEmailChange(Long userId, EmailChangeRequest request) {
        validateHashSalt();

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_PROFILE_NOT_FOUND));

        String newEmail = normalizeEmail(request.getNewEmail());
        if (newEmail.equalsIgnoreCase(user.getEmail())) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "same email");
        }
        if (userRepository.existsByEmail(newEmail)) {
            throw new BusinessException(ErrorCode.DUPLICATE_EMAIL);
        }

        tokenRepository.findTopByUserIdAndUsedAtIsNullOrderByCreatedAtDesc(userId).ifPresent(latest -> {
            LocalDateTime cooldownLimit = latest.getCreatedAt().plusSeconds(requestCooldownSeconds);
            if (LocalDateTime.now().isBefore(cooldownLimit)) {
                throw new BusinessException(ErrorCode.VERIFICATION_TOO_MANY_REQUESTS);
            }
        });

        String token = createEmailChangeToken(newEmail);
        String tokenHash = verificationHashSupport.hashWithCurrentSalt(token);
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(tokenTtlHours);

        tokenRepository.save(new EmailVerificationToken(userId, tokenHash, expiresAt));
        emailVerificationSenderPort.sendEmailChangeVerificationEmail(newEmail, token, expiresAt);

        return new EmailVerificationRequestResponse(expiresAt, exposeDevToken ? token : null);
    }

    /**
     * 계정 이메일 인증 토큰을 확정한다.
     * 토큰이 유효하면 `users.email_verified`를 true로 바꾸고 토큰은 사용 처리한다.
     */
    @Transactional
    public void confirmEmailVerification(String token) {
        validateHashSalt();

        if (token == null || token.isBlank()) {
            throw new BusinessException(ErrorCode.EMAIL_VERIFICATION_TOKEN_INVALID);
        }

        EmailVerificationToken emailVerificationToken = findEmailVerificationToken(token);

        if (emailVerificationToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(ErrorCode.EMAIL_VERIFICATION_TOKEN_EXPIRED);
        }

        User user = userRepository.findById(emailVerificationToken.getUserId())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_PROFILE_NOT_FOUND));

        if (!user.isEmailVerified()) {
            user.setEmailVerified(true);
            userRepository.save(user);
        }

        emailVerificationToken.markUsed(LocalDateTime.now());
        tokenRepository.save(emailVerificationToken);
    }

    /**
     * 이메일 변경 토큰을 확정하고 계정 이메일을 바꾼다.
     * 토큰에 인코딩된 새 이메일을 꺼내 중복 여부를 확인한 뒤 `email_verified`까지 true로 유지한다.
     */
    @Transactional
    public void confirmEmailChange(Long userId, String token) {
        validateHashSalt();

        if (token == null || token.isBlank()) {
            throw new BusinessException(ErrorCode.EMAIL_VERIFICATION_TOKEN_INVALID);
        }

        EmailVerificationToken emailVerificationToken = findEmailVerificationToken(token);

        if (!emailVerificationToken.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        if (emailVerificationToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(ErrorCode.EMAIL_VERIFICATION_TOKEN_EXPIRED);
        }

        String newEmail = parseEmailFromChangeToken(token);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_PROFILE_NOT_FOUND));

        if (!newEmail.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmail(newEmail)) {
            throw new BusinessException(ErrorCode.DUPLICATE_EMAIL);
        }

        user.setEmail(newEmail);
        user.setEmailVerified(true);
        userRepository.save(user);

        emailVerificationToken.markUsed(LocalDateTime.now());
        tokenRepository.save(emailVerificationToken);
    }

    private void validateHashSalt() {
        verificationHashSupport.ensureConfigured();
    }

    private EmailVerificationToken findEmailVerificationToken(String token) {
        return verificationHashSupport.candidateHashes(token).stream()
                .map(tokenRepository::findByTokenHashAndUsedAtIsNull)
                .flatMap(Optional::stream)
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.EMAIL_VERIFICATION_TOKEN_INVALID));
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED);
        }
        return email.trim().toLowerCase();
    }

    private String createEmailChangeToken(String newEmail) {
        String payload = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(newEmail.getBytes(StandardCharsets.UTF_8));
        return UUID.randomUUID().toString().replace("-", "") + "." + payload;
    }

    private String parseEmailFromChangeToken(String token) {
        int idx = token.indexOf('.');
        if (idx <= 0 || idx >= token.length() - 1) {
            throw new BusinessException(ErrorCode.EMAIL_VERIFICATION_TOKEN_INVALID);
        }

        String encoded = token.substring(idx + 1);
        try {
            String parsed = new String(Base64.getUrlDecoder().decode(encoded), StandardCharsets.UTF_8);
            return normalizeEmail(parsed);
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.EMAIL_VERIFICATION_TOKEN_INVALID);
        }
    }
}
