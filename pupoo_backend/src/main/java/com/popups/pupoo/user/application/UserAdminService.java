// file: src/main/java/com/popups/pupoo/user/application/UserAdminService.java
package com.popups.pupoo.user.application;

import com.popups.pupoo.common.audit.application.AdminLogService;
import com.popups.pupoo.common.audit.domain.enums.AdminTargetType;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.user.domain.enums.RoleName;
import com.popups.pupoo.user.domain.enums.UserStatus;
import com.popups.pupoo.user.domain.model.User;
import com.popups.pupoo.user.dto.AdminUserUpdateRequest;
import com.popups.pupoo.user.dto.UserCreateRequest;
import com.popups.pupoo.user.dto.UserResponse;
import com.popups.pupoo.user.dto.UserSearchRequest;
import com.popups.pupoo.user.persistence.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 관리자용 사용자 관리 서비스
 *
 * 정책
 * - users.status는 DB ENUM('ACTIVE','SUSPENDED','DELETED') 기준
 * - 관리자 상태 변경은 엄격 모드(STRICT)
 *   - ACTIVE <-> SUSPENDED 만 허용
 *   - DELETED는 관리자 변경 불가(종단 상태)
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserAdminService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AdminLogService adminLogService;

    public Page<UserResponse> list(UserSearchRequest cond, Pageable pageable) {
        String keyword = (cond == null ? null : trimToNull(cond.getKeyword()));
        UserStatus status = (cond == null ? null : cond.getStatus());
        return userRepository.search(status, keyword, pageable).map(UserResponse::from);
    }

    public UserResponse get(Long userId) {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "사용자가 존재하지 않습니다."));
        return UserResponse.from(u);
    }

    @Transactional
    public UserResponse create(UserCreateRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "이미 존재하는 이메일입니다.");
        }
        if (userRepository.existsByPhone(req.getPhone())) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "이미 존재하는 전화번호입니다.");
        }
        if (userRepository.existsByNickname(req.getNickname())) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "이미 존재하는 닉네임입니다.");
        }

        User u = new User();
        u.setEmail(req.getEmail());
        u.setPassword(passwordEncoder.encode(req.getPassword()));
        u.setNickname(req.getNickname());
        u.setPhone(req.getPhone());

        u.setStatus(UserStatus.ACTIVE);
        u.setRoleName(RoleName.USER);

        u.setShowAge(req.isShowAge());
        u.setShowGender(req.isShowGender());
        u.setShowPet(req.isShowPet());

        User saved = userRepository.save(u);
        adminLogService.write("USER_CREATE", AdminTargetType.USER, saved.getUserId());
        return UserResponse.from(saved);
    }

    @Transactional
    public UserResponse update(Long userId, AdminUserUpdateRequest req) {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "사용자가 존재하지 않습니다."));

        // DELETED는 종단 상태로 간주한다.
        if (u.getStatus() == UserStatus.DELETED) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "탈퇴(DELETED) 상태의 사용자는 변경할 수 없습니다.");
        }

        if (req.getNickname() != null && !req.getNickname().isBlank()) {
            if (!req.getNickname().equals(u.getNickname()) && userRepository.existsByNickname(req.getNickname())) {
                throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "이미 존재하는 닉네임입니다.");
            }
            u.setNickname(req.getNickname());
        }

        if (req.getPhone() != null && !req.getPhone().isBlank()) {
            if (!req.getPhone().equals(u.getPhone()) && userRepository.existsByPhone(req.getPhone())) {
                throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "이미 존재하는 전화번호입니다.");
            }
            u.setPhone(req.getPhone());
        }

        if (req.getStatus() != null) {
            applyStrictStatusTransition(u, req.getStatus());
        }
        if (req.getShowAge() != null) u.setShowAge(req.getShowAge());
        if (req.getShowGender() != null) u.setShowGender(req.getShowGender());
        if (req.getShowPet() != null) u.setShowPet(req.getShowPet());

        adminLogService.write("USER_UPDATE", AdminTargetType.USER, userId);
        return UserResponse.from(u);
    }

    @Transactional
    public void delete(Long userId) {
        // 정책(B): 관리자는 DELETED(탈퇴) 전이를 수행하지 않는다.
        // - 운영 상 탈퇴 처리는 사용자 탈퇴 플로우에서만 수행
        // - 관리자 API에서 호출되면 명시적으로 차단
        throw new BusinessException(ErrorCode.INVALID_REQUEST, "관리자 기능으로는 탈퇴(DELETED) 처리할 수 없습니다.");
    }

    /**
     * 관리자 상태 변경(엄격 모드)
     * - ACTIVE <-> SUSPENDED 만 허용
     * - DELETED로의 변경은 불가
     */
    private static void applyStrictStatusTransition(User u, UserStatus next) {
        UserStatus cur = u.getStatus();

        if (next == UserStatus.DELETED) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "관리자 기능으로는 탈퇴(DELETED) 상태로 변경할 수 없습니다.");
        }

        // 동일 상태는 no-op
        if (cur == next) return;

        boolean allowed =
                (cur == UserStatus.ACTIVE && next == UserStatus.SUSPENDED)
                        || (cur == UserStatus.SUSPENDED && next == UserStatus.ACTIVE);

        if (!allowed) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "허용되지 않은 사용자 상태 변경입니다.");
        }

        u.setStatus(next);
    }

    private static String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
