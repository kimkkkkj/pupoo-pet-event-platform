package com.popups.pupoo.user.application;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.user.domain.model.User;
import com.popups.pupoo.user.dto.UserCreateRequest;
import com.popups.pupoo.user.persistence.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserServiceTest {

    private UserRepository userRepository;
    private UserService userService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        userService = new UserService(userRepository, passwordEncoder);
    }

    @Test
    void createWithPasswordHashRejectsDuplicatePhoneUsingNormalizedCountQuery() {
        UserCreateRequest request = createRequest("+82 10-1234-5678");

        when(userRepository.existsByEmail("tester@example.com")).thenReturn(false);
        when(userRepository.countByNormalizedPhoneVariants("821012345678", "01012345678")).thenReturn(1L);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> userService.createWithPasswordHash(request, "hashed-password")
        );

        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.DUPLICATE_PHONE);
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void validateSignupAvailabilityRejectsDuplicateEmailBeforeFurtherChecks() {
        when(userRepository.existsByEmail("tester@example.com")).thenReturn(true);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> userService.validateSignupAvailability("tester@example.com", "tester", "+82 10-1234-5678")
        );

        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.DUPLICATE_EMAIL);
        verify(userRepository, never()).countByNormalizedPhoneVariants(any(), any());
    }

    @Test
    void createWithPasswordHashSavesNormalizedPhoneWhenNoDuplicateExists() {
        UserCreateRequest request = createRequest("+82 10-1234-5678");

        when(userRepository.existsByEmail("tester@example.com")).thenReturn(false);
        when(userRepository.countByNormalizedPhoneVariants("821012345678", "01012345678")).thenReturn(0L);
        when(userRepository.existsByNickname("tester")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        userService.createWithPasswordHash(request, "hashed-password");

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).countByNormalizedPhoneVariants("821012345678", "01012345678");
        verify(userRepository).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getPhone()).isEqualTo("821012345678");
        assertThat(userCaptor.getValue().getPassword()).isEqualTo("hashed-password");
    }

    private UserCreateRequest createRequest(String phone) {
        UserCreateRequest request = new UserCreateRequest();
        request.setEmail("tester@example.com");
        request.setNickname("tester");
        request.setPhone(phone);
        request.setShowAge(false);
        request.setShowGender(false);
        request.setShowPet(false);
        return request;
    }
}
