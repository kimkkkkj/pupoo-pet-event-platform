// file: src/main/java/com/popups/pupoo/user/application/UserService.java
package com.popups.pupoo.user.application;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.user.domain.enums.RoleName;
import com.popups.pupoo.user.domain.enums.UserStatus;
import com.popups.pupoo.user.domain.model.User;
import com.popups.pupoo.user.dto.UserCreateRequest;
import com.popups.pupoo.user.dto.UserMeResponse;
import com.popups.pupoo.user.dto.UserUpdateRequest;
import com.popups.pupoo.user.persistence.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 사용자 도메인 서비스
 * - 사용자 생성/조회/수정/탈퇴 등 User 리소스 책임만 담당한다.
 * - 인증/토큰 발급/refresh 저장/쿠키 세팅은 auth 도메인에서 담당한다.
 */
@Service
public class UserService {

    private static final String DUPLICATE_EMAIL_MESSAGE = "이미 가입된 이메일입니다.";
    private static final String DUPLICATE_PHONE_MESSAGE = "이미 가입된 전화번호입니다.";
    private static final String DUPLICATE_NICKNAME_MESSAGE = "이미 사용 중인 닉네임입니다.";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public boolean isNicknameAvailable(String nickname) {
        String value = nickname == null ? "" : nickname.trim();
        if (value.isBlank()) return false;
        return !userRepository.existsByNickname(value);
    }

    @Transactional(readOnly = true)
    public void validateSignupAvailability(String email, String nickname, String phone) {
        String emailValue = email == null ? "" : email.trim();
        String nicknameValue = nickname == null ? "" : nickname.trim();
        String normalizedPhone = normalizePhone(phone);

        if (!emailValue.isBlank() && userRepository.existsByEmail(emailValue)) {
            throw new BusinessException(ErrorCode.DUPLICATE_EMAIL, DUPLICATE_EMAIL_MESSAGE);
        }
        if (!normalizedPhone.isBlank()
                && userRepository.countByNormalizedPhoneVariants(normalizedPhone, toAlternatePhone(normalizedPhone)) > 0) {
            throw new BusinessException(ErrorCode.DUPLICATE_PHONE, DUPLICATE_PHONE_MESSAGE);
        }
        if (!nicknameValue.isBlank() && userRepository.existsByNickname(nicknameValue)) {
            throw new BusinessException(ErrorCode.DUPLICATE_NICKNAME, DUPLICATE_NICKNAME_MESSAGE);
        }
    }

    /**
     * 회원가입을 위한 사용자 생성
     * - 중복 검증 후 사용자 엔티티를 생성/저장하고 엔티티를 반환한다.
     * - 자동 로그인(토큰 발급, refresh 저장, 쿠키 세팅)은 auth에서 처리한다.
     */
    @Transactional
    public User create(UserCreateRequest req) {
        String normalizedPhone = normalizePhone(req.getPhone());
        validateSignupAvailability(req.getEmail(), req.getNickname(), req.getPhone());

        User user = new User();
        user.setEmail(req.getEmail());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setNickname(req.getNickname());
        user.setPhone(normalizedPhone);

        user.setStatus(UserStatus.ACTIVE);
        user.setRoleName(RoleName.USER);

        user.setShowAge(req.isShowAge());
        user.setShowGender(req.isShowGender());
        user.setShowPet(req.isShowPet());

        return userRepository.save(user);
    }

    /**
     * 현재 로그인 사용자 정보 조회
     */
    @Transactional(readOnly = true)
    public UserMeResponse getMe(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        return UserMeResponse.from(user);
    }

    /**
     * 현재 로그인 사용자 정보 수정
     * - 부분 수정: null이면 변경하지 않는다.
     * - 닉네임 변경 시 중복 검증을 수행한다.
     * - phone은 본인인증 후 별도 플로우에서만 변경 가능하므로 여기서는 수정하지 않는다.
     */
    @Transactional
    public UserMeResponse updateMe(Long userId, UserUpdateRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));

        String newNickname = req.getNickname();
        if (newNickname != null && !newNickname.isBlank()) {
            if (!newNickname.equals(user.getNickname()) && userRepository.existsByNickname(newNickname)) {
                throw new BusinessException(ErrorCode.DUPLICATE_NICKNAME, DUPLICATE_NICKNAME_MESSAGE);
            }
            user.setNickname(newNickname);
        }

        if (req.getShowAge() != null) {
            user.setShowAge(req.getShowAge());
        }
        if (req.getShowGender() != null) {
            user.setShowGender(req.getShowGender());
        }
        if (req.getShowPet() != null) {
            user.setShowPet(req.getShowPet());
        }

        return UserMeResponse.from(user);
    }

    /**
     * 현재 로그인 사용자 탈퇴 처리
     * - 정책: soft delete (status 변경)
     */
    @Transactional
    public void deleteMe(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));

        // 정책: 탈퇴는 DELETED(종단 상태)로 전이
        user.setStatus(UserStatus.DELETED);
    }

    /**
     * 회원가입 세션(OTP 선검증) 기반 사용자 생성
     * - passwordHash는 이미 BCrypt 해시된 값이어야 한다.
     * - 본 메서드는 해시를 재인코딩하지 않는다.
     */
    @Transactional
    public User createWithPasswordHash(UserCreateRequest req, String passwordHash) {
        String normalizedPhone = normalizePhone(req.getPhone());
        validateSignupAvailability(req.getEmail(), req.getNickname(), req.getPhone());

        if (passwordHash == null || passwordHash.isBlank()) {
            throw new IllegalArgumentException("Password hash missing");
        }

        User user = new User();
        user.setEmail(req.getEmail());
        user.setPassword(passwordHash);
        user.setNickname(req.getNickname());
        user.setPhone(normalizedPhone);

        user.setStatus(UserStatus.ACTIVE);
        user.setRoleName(RoleName.USER);

        user.setShowAge(req.isShowAge());
        user.setShowGender(req.isShowGender());
        user.setShowPet(req.isShowPet());

        return userRepository.save(user);
    }

    private String normalizePhone(String phone) {
        if (phone == null) {
            return "";
        }
        return phone.replaceAll("[^0-9]", "");
    }

    private String toAlternatePhone(String normalizedPhone) {
        if (normalizedPhone == null || normalizedPhone.isBlank()) {
            return "";
        }
        if (normalizedPhone.startsWith("82") && normalizedPhone.length() >= 11) {
            return "0" + normalizedPhone.substring(2);
        }
        if (normalizedPhone.startsWith("0") && normalizedPhone.length() >= 10) {
            return "82" + normalizedPhone.substring(1);
        }
        return normalizedPhone;
    }
}
