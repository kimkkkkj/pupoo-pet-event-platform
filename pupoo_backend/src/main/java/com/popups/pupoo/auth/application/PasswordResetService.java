package com.popups.pupoo.auth.application;

import com.popups.pupoo.auth.domain.model.PasswordResetToken;
import com.popups.pupoo.auth.dto.PasswordResetConfirmRequest;
import com.popups.pupoo.auth.dto.PasswordResetRequest;
import com.popups.pupoo.auth.dto.PasswordResetRequestResponse;
import com.popups.pupoo.auth.dto.PasswordResetVerifyRequest;
import com.popups.pupoo.auth.persistence.PasswordResetTokenRepository;
import com.popups.pupoo.auth.persistence.RefreshTokenRepository;
import com.popups.pupoo.auth.port.EmailVerificationSenderPort;
import com.popups.pupoo.auth.support.VerificationHashSupport;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.user.domain.enums.UserStatus;
import com.popups.pupoo.user.domain.model.User;
import com.popups.pupoo.user.persistence.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 비밀번호 재설정 전용 서비스다.
 * 이메일과 휴대폰 번호를 모두 확인한 뒤 재설정 코드를 발급하고,
 * 최종 확정 시 기존 refresh token을 모두 제거해 기존 세션을 종료한다.
 */
@Service
public class PasswordResetService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int VERIFICATION_CODE_LENGTH = 6;

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailVerificationSenderPort emailVerificationSenderPort;
    private final VerificationHashSupport verificationHashSupport;
    private final int tokenTtlMinutes;
    private final boolean exposeDevCode;

    public PasswordResetService(
            UserRepository userRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            EmailVerificationSenderPort emailVerificationSenderPort,
            VerificationHashSupport verificationHashSupport,
            @Value("${verification.password-reset.ttl-minutes:30}") int tokenTtlMinutes,
            @Value("${verification.dev.expose:false}") boolean exposeDevCode
    ) {
        this.userRepository = userRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailVerificationSenderPort = emailVerificationSenderPort;
        this.verificationHashSupport = verificationHashSupport;
        this.tokenTtlMinutes = tokenTtlMinutes;
        this.exposeDevCode = exposeDevCode;
    }

    /**
     * 비밀번호 재설정 코드를 발급한다.
     * 같은 사용자에게 남아 있던 미사용 토큰은 모두 사용 처리해 가장 최근 코드만 유효하게 만든다.
     */
    @Transactional
    public PasswordResetRequestResponse requestPasswordReset(PasswordResetRequest request) {
        validateHashSalt();

        User user = resolveResetUser(
                request == null ? null : request.getEmail(),
                request == null ? null : request.getPhone()
        );

        LocalDateTime now = LocalDateTime.now();
        List<PasswordResetToken> activeTokens =
                passwordResetTokenRepository.findAllByUserIdAndUsedAtIsNull(user.getUserId());
        for (PasswordResetToken token : activeTokens) {
            token.markUsed(now);
        }

        String verificationCode = generateVerificationCode();
        String tokenHash = verificationHashSupport.hashWithCurrentSalt(verificationCode);
        LocalDateTime expiresAt = now.plusMinutes(tokenTtlMinutes);

        passwordResetTokenRepository.save(new PasswordResetToken(user.getUserId(), tokenHash, expiresAt));
        emailVerificationSenderPort.sendPasswordResetEmail(user.getEmail(), verificationCode);

        return new PasswordResetRequestResponse(expiresAt, exposeDevCode ? verificationCode : null);
    }

    /**
     * 재설정 코드를 선검증한다.
     * 가장 최근의 미사용 토큰만 확인하며, 성공 시 별도 상태 변경은 하지 않는다.
     */
    @Transactional(readOnly = true)
    public void verifyPasswordResetCode(PasswordResetVerifyRequest request) {
        resolveVerifiedContext(
                request == null ? null : request.getEmail(),
                request == null ? null : request.getPhone(),
                request == null ? null : request.getVerificationCode()
        );
    }

    /**
     * 검증된 코드로 비밀번호를 실제 변경한다.
     * 비밀번호 변경 후에는 기존 refresh token을 모두 삭제해 다른 기기 세션도 함께 무효화한다.
     */
    @Transactional
    public void confirmPasswordReset(PasswordResetConfirmRequest request) {
        if (request == null || request.getNewPassword() == null || request.getNewPassword().isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "newPassword: must not be blank");
        }

        PasswordResetContext context = resolveVerifiedContext(
                request.getEmail(),
                request.getPhone(),
                request.getVerificationCode()
        );

        context.user().setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(context.user());

        refreshTokenRepository.deleteAllByUserId(context.user().getUserId());

        context.token().markUsed(LocalDateTime.now());
        passwordResetTokenRepository.save(context.token());
    }

    /**
     * 이메일, 휴대폰 번호, 인증 코드가 모두 맞는 재설정 컨텍스트만 반환한다.
     */
    private PasswordResetContext resolveVerifiedContext(String email, String phone, String verificationCode) {
        validateHashSalt();

        User user = resolveResetUser(email, phone);
        PasswordResetToken passwordResetToken = passwordResetTokenRepository
                .findTopByUserIdAndUsedAtIsNullOrderByCreatedAtDesc(user.getUserId())
                .orElseThrow(() -> new BusinessException(ErrorCode.PASSWORD_RESET_TOKEN_INVALID));

        if (passwordResetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(ErrorCode.PASSWORD_RESET_TOKEN_EXPIRED);
        }

        String normalizedCode = normalizeVerificationCode(verificationCode);
        if (!verificationHashSupport.matchesAnySalt(normalizedCode, passwordResetToken.getTokenHash())) {
            throw new BusinessException(ErrorCode.PASSWORD_RESET_TOKEN_INVALID);
        }

        return new PasswordResetContext(user, passwordResetToken);
    }

    private void validateHashSalt() {
        verificationHashSupport.ensureConfigured();
    }

    private User resolveResetUser(String email, String phone) {
        String normalizedEmail = normalizeEmail(email);
        String normalizedPhone = normalizePhone(phone);

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_REQUEST, "일치하는 회원 정보를 찾을 수 없습니다."));

        UserStatus status = user.getStatus();
        if (status != UserStatus.ACTIVE || !normalizePhone(user.getPhone()).equals(normalizedPhone)) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "일치하는 회원 정보를 찾을 수 없습니다.");
        }

        return user;
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "email: must not be blank");
        }
        return email.trim().toLowerCase();
    }

    private String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "phone: must not be blank");
        }

        String normalized = phone.replaceAll("[^0-9]", "");
        if (normalized.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "phone: must contain digits");
        }
        return normalized;
    }

    private String normalizeVerificationCode(String verificationCode) {
        if (verificationCode == null || verificationCode.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "verificationCode: must not be blank");
        }

        String normalized = verificationCode.trim();
        if (!normalized.matches("\\d{" + VERIFICATION_CODE_LENGTH + "}")) {
            throw new BusinessException(ErrorCode.PASSWORD_RESET_TOKEN_INVALID);
        }
        return normalized;
    }

    private String generateVerificationCode() {
        return String.format("%0" + VERIFICATION_CODE_LENGTH + "d", SECURE_RANDOM.nextInt(1_000_000));
    }

    private record PasswordResetContext(User user, PasswordResetToken token) {
    }
}
