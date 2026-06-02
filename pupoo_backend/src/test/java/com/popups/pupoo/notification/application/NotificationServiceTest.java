package com.popups.pupoo.notification.application;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.event.persistence.EventRepository;
import com.popups.pupoo.notice.persistence.NoticeRepository;
import com.popups.pupoo.notification.persistence.NotificationInboxRepository;
import com.popups.pupoo.notification.persistence.NotificationRepository;
import com.popups.pupoo.notification.persistence.NotificationSendRepository;
import com.popups.pupoo.notification.persistence.NotificationSettingsRepository;
import com.popups.pupoo.notification.port.NotificationSender;
import com.popups.pupoo.user.persistence.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NotificationServiceTest {

    private NotificationInboxRepository notificationInboxRepository;
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationInboxRepository = mock(NotificationInboxRepository.class);
        notificationService = new NotificationService(
                mock(NotificationRepository.class),
                notificationInboxRepository,
                mock(NotificationSettingsRepository.class),
                mock(NotificationSendRepository.class),
                mock(UserRepository.class),
                mock(EventRepository.class),
                mock(NoticeRepository.class),
                mock(NotificationSender.class),
                mock(NotificationSseService.class)
        );
    }

    @Test
    void deleteRemovesInboxItemOwnedByUser() {
        when(notificationInboxRepository.deleteByInboxIdAndUserId(15L, 7L)).thenReturn(1);

        notificationService.delete(7L, 15L);

        verify(notificationInboxRepository).deleteByInboxIdAndUserId(15L, 7L);
    }

    @Test
    void deleteThrowsWhenInboxItemDoesNotExistForUser() {
        when(notificationInboxRepository.deleteByInboxIdAndUserId(15L, 7L)).thenReturn(0);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> notificationService.delete(7L, 15L)
        );

        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
    }
}
