// file: src/main/java/com/popups/pupoo/notification/application/NotificationService.java
package com.popups.pupoo.notification.application;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.event.persistence.EventRepository;
import com.popups.pupoo.notice.persistence.NoticeRepository;
import com.popups.pupoo.notification.domain.enums.InboxTargetType;
import com.popups.pupoo.notification.domain.enums.NotificationChannel;
import com.popups.pupoo.notification.domain.enums.NotificationType;
import com.popups.pupoo.notification.domain.enums.RecipientScope;
import com.popups.pupoo.notification.domain.enums.SenderType;
import com.popups.pupoo.notification.domain.model.Notification;
import com.popups.pupoo.notification.domain.model.NotificationInbox;
import com.popups.pupoo.notification.domain.model.NotificationSend;
import com.popups.pupoo.notification.domain.model.NotificationSettings;
import com.popups.pupoo.notification.dto.AdminNotificationPublishResult;
import com.popups.pupoo.notification.dto.NotificationBroadcastRequest;
import com.popups.pupoo.notification.dto.NotificationCreateRequest;
import com.popups.pupoo.notification.dto.NotificationInboxResponse;
import com.popups.pupoo.notification.dto.NotificationListResponse;
import com.popups.pupoo.notification.dto.NotificationResponse;
import com.popups.pupoo.notification.dto.NotificationSettingsResponse;
import com.popups.pupoo.notification.dto.NotificationSsePayload;
import com.popups.pupoo.notification.persistence.NotificationInboxRepository;
import com.popups.pupoo.notification.persistence.NotificationRepository;
import com.popups.pupoo.notification.persistence.NotificationSendRepository;
import com.popups.pupoo.notification.persistence.NotificationSettingsRepository;
import com.popups.pupoo.notification.port.NotificationSender;
import com.popups.pupoo.user.persistence.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;

/**
 * 알림 조회와 발행을 담당한다.
 */
@Service
@Transactional(readOnly = true)
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationInboxRepository notificationInboxRepository;
    private final NotificationSettingsRepository notificationSettingsRepository;
    private final NotificationSendRepository notificationSendRepository;
    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final NoticeRepository noticeRepository;
    private final NotificationSender notificationSender;
    private final NotificationSseService notificationSseService;

    public NotificationService(NotificationRepository notificationRepository,
                               NotificationInboxRepository notificationInboxRepository,
                               NotificationSettingsRepository notificationSettingsRepository,
                               NotificationSendRepository notificationSendRepository,
                               UserRepository userRepository,
                               EventRepository eventRepository,
                               NoticeRepository noticeRepository,
                               NotificationSender notificationSender,
                               NotificationSseService notificationSseService) {
        this.notificationRepository = notificationRepository;
        this.notificationInboxRepository = notificationInboxRepository;
        this.notificationSettingsRepository = notificationSettingsRepository;
        this.notificationSendRepository = notificationSendRepository;
        this.userRepository = userRepository;
        this.eventRepository = eventRepository;
        this.noticeRepository = noticeRepository;
        this.notificationSender = notificationSender;
        this.notificationSseService = notificationSseService;
    }

    public NotificationListResponse getMyInbox(Long userId, Pageable pageable) {
        Page<NotificationInbox> page = notificationInboxRepository.findMyInbox(userId, pageable);
        List<NotificationInboxResponse> items = page.getContent().stream()
                .map(this::toInboxResponse)
                .toList();

        return NotificationListResponse.of(
                items,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    public long getUnreadCount(Long userId) {
        return notificationInboxRepository.countByUserId(userId);
    }

    private NotificationInboxResponse toInboxResponse(NotificationInbox inbox) {
        String targetPath = resolveTargetPath(inbox.getTargetType(), inbox.getTargetId());
        return new NotificationInboxResponse(
                inbox.getInboxId(),
                inbox.getNotification().getType(),
                inbox.getNotification().getNotificationTitle(),
                inbox.getNotification().getContent(),
                inbox.getCreatedAt(),
                inbox.getTargetType(),
                inbox.getTargetId(),
                targetPath != null,
                targetPath
        );
    }

    private String resolveTargetPath(InboxTargetType targetType, Long targetId) {
        if (targetType == null || targetId == null) {
            return null;
        }
        if (targetType == InboxTargetType.EVENT) {
            return eventRepository.existsById(targetId) ? "/event/current" : null;
        }
        if (targetType == InboxTargetType.NOTICE) {
            if (targetId <= 0 || !noticeRepository.existsById(targetId)) {
                return null;
            }
            return "/community/notice/" + targetId;
        }
        return null;
    }

    @Transactional
    public NotificationResponse click(Long userId, Long inboxId) {
        NotificationInbox inbox = notificationInboxRepository.findByInboxIdAndUserId(inboxId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        notificationInboxRepository.delete(inbox);
        return new NotificationResponse(inbox.getTargetType(), inbox.getTargetId());
    }

    @Transactional
    public void delete(Long userId, Long inboxId) {
        int deleted = notificationInboxRepository.deleteByInboxIdAndUserId(inboxId, userId);
        if (deleted < 1) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND);
        }
    }

    public NotificationSettingsResponse getSettings(Long userId) {
        NotificationSettings settings = notificationSettingsRepository.findById(userId)
                .orElseGet(() -> NotificationSettings.createDefault(userId));
        return NotificationSettingsResponse.from(settings);
    }

    @Transactional
    public NotificationSettingsResponse updateAllowMarketing(Long userId, boolean allowMarketing) {
        NotificationSettings settings = notificationSettingsRepository.findById(userId)
                .orElseGet(() -> NotificationSettings.createDefault(userId));

        settings.updateAllowMarketing(allowMarketing);
        notificationSettingsRepository.save(settings);
        return NotificationSettingsResponse.from(settings);
    }

    @Transactional
    public void publishEventInterestNotification(Long eventId,
                                                 NotificationType type,
                                                 String title,
                                                 String content,
                                                 InboxTargetType targetType,
                                                 Long targetId) {
        Notification notification = Notification.create(type, title, content);
        notificationRepository.save(notification);

        LinkedHashSet<Long> recipientUserIds = resolveRecipientUserIds(eventId, List.of(RecipientScope.INTEREST_SUBSCRIBERS));
        fanoutInbox(recipientUserIds, notification, targetType, targetId);
        publishSseAfterCommit(recipientUserIds, new NotificationSsePayload(type.name(), targetType.name(), targetId));
    }

    @Transactional
    public void publishUserNoticeNotification(Long userId,
                                              String title,
                                              String content,
                                              InboxTargetType targetType,
                                              Long targetId) {
        if (userId == null || !userRepository.existsById(userId)) {
            return;
        }

        Notification notification = Notification.create(NotificationType.SYSTEM, title, content);
        notificationRepository.save(notification);
        notificationInboxRepository.save(NotificationInbox.create(userId, notification, targetType, targetId));
        notificationSendRepository.save(
                NotificationSend.create(notification, userId, SenderType.SYSTEM, NotificationChannel.APP)
        );
        notificationSender.send(
                new NotificationSender.SendCommand(
                        notification.getNotificationId(),
                        userId,
                        userId,
                        SenderType.SYSTEM,
                        NotificationChannel.APP
                )
        );
        publishSseAfterCommit(userId, new NotificationSsePayload(NotificationType.SYSTEM.name(), targetType.name(), targetId));
    }

    @Transactional
    public AdminNotificationPublishResult publishAdminEventNotification(Long adminUserId, NotificationCreateRequest request) {
        validateEventNotificationRequest(request);

        Notification notification = Notification.create(request.getType(), request.getTitle(), request.getContent());
        notificationRepository.save(notification);

        List<NotificationChannel> channels = normalizeChannels(request.getChannels());
        List<RecipientScope> scopes = normalizeRecipientScopes(request);
        int targetCount = countAdminEventRecipients(request.getEventId(), scopes);

        if (channels.contains(NotificationChannel.APP)) {
            LinkedHashSet<Long> recipientUserIds = resolveRecipientUserIds(request.getEventId(), scopes);
            fanoutInbox(recipientUserIds, notification, request.getTargetType(), request.getTargetId());
            notificationSendRepository.save(NotificationSend.create(notification, adminUserId, SenderType.ADMIN, NotificationChannel.APP));
            notificationSender.send(new NotificationSender.SendCommand(notification.getNotificationId(), null, adminUserId, SenderType.ADMIN, NotificationChannel.APP));
            publishSseAfterCommit(
                    recipientUserIds,
                    new NotificationSsePayload(request.getType().name(), request.getTargetType().name(), request.getTargetId())
            );
        }

        if (channels.contains(NotificationChannel.EMAIL)) {
            fanoutSendOnly(request.getEventId(), notification.getNotificationId(), scopes, NotificationChannel.EMAIL);
            notificationSendRepository.save(NotificationSend.create(notification, adminUserId, SenderType.ADMIN, NotificationChannel.EMAIL));
        }

        if (channels.contains(NotificationChannel.SMS)) {
            fanoutSendOnly(request.getEventId(), notification.getNotificationId(), scopes, NotificationChannel.SMS);
            notificationSendRepository.save(NotificationSend.create(notification, adminUserId, SenderType.ADMIN, NotificationChannel.SMS));
        }

        if (channels.contains(NotificationChannel.PUSH)) {
            notificationSendRepository.save(NotificationSend.create(notification, adminUserId, SenderType.ADMIN, NotificationChannel.PUSH));
        }
        return new AdminNotificationPublishResult(notification.getNotificationId(), targetCount);
    }

    @Transactional
    public AdminNotificationPublishResult publishAdminBroadcastNotification(Long adminUserId, NotificationBroadcastRequest request) {
        Notification notification = Notification.create(request.getType(), request.getTitle(), request.getContent());
        notificationRepository.save(notification);

        List<NotificationChannel> channels = normalizeChannels(request.getChannels());
        InboxTargetType targetType = request.getTargetType() == null ? InboxTargetType.NOTICE : request.getTargetType();
        Long targetId = request.getTargetId() == null ? 0L : request.getTargetId();
        List<Long> activeUserIds = userRepository.findActiveUserIds();
        int targetCount = activeUserIds.size();

        if (channels.contains(NotificationChannel.APP)) {
            targetCount = notificationInboxRepository.fanoutInboxByAllActiveUsers(
                    notification.getNotificationId(),
                    targetType.name(),
                    targetId
            );
            notificationSendRepository.save(NotificationSend.create(notification, adminUserId, SenderType.ADMIN, NotificationChannel.APP));
            notificationSender.send(new NotificationSender.SendCommand(notification.getNotificationId(), null, adminUserId, SenderType.ADMIN, NotificationChannel.APP));
            publishSseAfterCommit(
                    activeUserIds,
                    new NotificationSsePayload(request.getType().name(), targetType.name(), targetId)
            );
        }

        if (channels.contains(NotificationChannel.EMAIL)) {
            notificationSendRepository.save(NotificationSend.create(notification, adminUserId, SenderType.ADMIN, NotificationChannel.EMAIL));
        }

        if (channels.contains(NotificationChannel.SMS)) {
            notificationSendRepository.save(NotificationSend.create(notification, adminUserId, SenderType.ADMIN, NotificationChannel.SMS));
        }

        if (channels.contains(NotificationChannel.PUSH)) {
            notificationSendRepository.save(NotificationSend.create(notification, adminUserId, SenderType.ADMIN, NotificationChannel.PUSH));
        }
        return new AdminNotificationPublishResult(notification.getNotificationId(), targetCount);
    }

    private List<NotificationChannel> normalizeChannels(List<NotificationChannel> channels) {
        if (channels == null || channels.isEmpty()) {
            return List.of(NotificationChannel.APP);
        }

        EnumSet<NotificationChannel> set = EnumSet.noneOf(NotificationChannel.class);
        set.addAll(channels);
        return new ArrayList<>(set);
    }

    public List<RecipientScope> normalizeAdminRecipientScopes(RecipientScope recipientScope,
                                                              List<RecipientScope> recipientScopes) {
        EnumSet<RecipientScope> scopes = EnumSet.noneOf(RecipientScope.class);
        if (recipientScopes != null) {
            scopes.addAll(recipientScopes);
        }
        if (recipientScope != null) {
            scopes.add(recipientScope);
        }
        if (scopes.isEmpty()) {
            scopes.add(RecipientScope.INTEREST_SUBSCRIBERS);
        }
        return new ArrayList<>(scopes);
    }

    private List<RecipientScope> normalizeRecipientScopes(NotificationCreateRequest request) {
        return normalizeAdminRecipientScopes(request.getRecipientScope(), request.getRecipientScopes());
    }

    private void fanoutInbox(Collection<Long> recipientUserIds,
                             Notification notification,
                             InboxTargetType targetType,
                             Long targetId) {
        if (recipientUserIds == null || recipientUserIds.isEmpty()) {
            return;
        }

        List<NotificationInbox> inboxes = recipientUserIds.stream()
                .map(userId -> NotificationInbox.create(userId, notification, targetType, targetId))
                .toList();
        notificationInboxRepository.saveAll(inboxes);
    }

    private void fanoutSendOnly(Long eventId,
                                Long notificationId,
                                List<RecipientScope> scopes,
                                NotificationChannel channel) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        if (channel == NotificationChannel.EMAIL) {
            List<String> emails = resolveEmails(eventId, scopes);
            if (!emails.isEmpty()) {
                notificationSender.sendEmail(emails, notification.getNotificationTitle(), notification.getContent());
            }
            return;
        }

        if (channel == NotificationChannel.SMS) {
            List<String> phones = resolvePhones(eventId, scopes);
            if (!phones.isEmpty()) {
                notificationSender.sendSms(phones, notification.getContent());
            }
            return;
        }

        throw new BusinessException(ErrorCode.INVALID_REQUEST);
    }

    private void publishSseAfterCommit(Long userId, NotificationSsePayload payload) {
        publishSseAfterCommit(List.of(userId), payload);
    }

    private void publishSseAfterCommit(Collection<Long> userIds, NotificationSsePayload payload) {
        if (userIds == null || userIds.isEmpty()) {
            return;
        }

        List<Long> recipients = userIds.stream().distinct().toList();
        Runnable action = () -> notificationSseService.sendNotification(recipients, payload);

        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            action.run();
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                action.run();
            }
        });
    }

    private List<String> resolveEmails(Long eventId, RecipientScope scope) {
        if (scope == RecipientScope.INTEREST_SUBSCRIBERS) {
            return notificationInboxRepository.findEmailTargetsByEventInterest(eventId);
        }
        if (scope == RecipientScope.EVENT_REGISTRANTS) {
            return notificationInboxRepository.findEmailTargetsByEventRegistrants(eventId);
        }
        if (scope == RecipientScope.EVENT_PAYERS) {
            return notificationInboxRepository.findEmailTargetsByEventPayers(eventId);
        }
        return List.of();
    }

    private List<String> resolveEmails(Long eventId, List<RecipientScope> scopes) {
        LinkedHashSet<String> emails = new LinkedHashSet<>();
        for (RecipientScope scope : scopes) {
            emails.addAll(resolveEmails(eventId, scope));
        }
        return new ArrayList<>(emails);
    }

    private List<String> resolvePhones(Long eventId, RecipientScope scope) {
        if (scope == RecipientScope.INTEREST_SUBSCRIBERS) {
            return notificationInboxRepository.findSmsTargetsByEventInterest(eventId);
        }
        if (scope == RecipientScope.EVENT_REGISTRANTS) {
            return notificationInboxRepository.findSmsTargetsByEventRegistrants(eventId);
        }
        if (scope == RecipientScope.EVENT_PAYERS) {
            return notificationInboxRepository.findSmsTargetsByEventPayers(eventId);
        }
        return List.of();
    }

    private List<String> resolvePhones(Long eventId, List<RecipientScope> scopes) {
        LinkedHashSet<String> phones = new LinkedHashSet<>();
        for (RecipientScope scope : scopes) {
            phones.addAll(resolvePhones(eventId, scope));
        }
        return new ArrayList<>(phones);
    }

    private LinkedHashSet<Long> resolveRecipientUserIds(Long eventId, List<RecipientScope> scopes) {
        LinkedHashSet<Long> recipientUserIds = new LinkedHashSet<>();
        for (RecipientScope scope : scopes) {
            if (scope == RecipientScope.INTEREST_SUBSCRIBERS) {
                recipientUserIds.addAll(notificationInboxRepository.findInAppUserIdsByEventInterest(eventId));
                continue;
            }
            if (scope == RecipientScope.EVENT_REGISTRANTS) {
                recipientUserIds.addAll(notificationInboxRepository.findInAppUserIdsByEventRegistrants(eventId));
                continue;
            }
            if (scope == RecipientScope.EVENT_PAYERS) {
                recipientUserIds.addAll(notificationInboxRepository.findInAppUserIdsByEventPayers(eventId));
                continue;
            }
            throw new BusinessException(ErrorCode.INVALID_REQUEST);
        }
        return recipientUserIds;
    }

    public int countAdminEventRecipients(Long eventId, List<RecipientScope> scopes) {
        return resolveRecipientUserIds(eventId, scopes).size();
    }

    public int countAllActiveRecipients() {
        return notificationInboxRepository.countAllActiveUsers();
    }

    private void validateEventNotificationRequest(NotificationCreateRequest request) {
        Long eventId = request.getEventId();
        if (eventId == null) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "eventId is required");
        }
        if (!eventRepository.existsById(eventId)) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "event not found: " + eventId);
        }
        if (request.getTargetType() == InboxTargetType.EVENT && !eventId.equals(request.getTargetId())) {
            throw new BusinessException(
                    ErrorCode.INVALID_REQUEST,
                    "targetId must match eventId when targetType is EVENT"
            );
        }
    }
}
