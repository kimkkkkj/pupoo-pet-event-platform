package com.popups.pupoo.notification.persistence;

import com.popups.pupoo.notification.domain.enums.AdminAlertMode;
import com.popups.pupoo.notification.domain.enums.AdminNotificationStatus;
import com.popups.pupoo.notification.domain.enums.NotificationType;
import com.popups.pupoo.notification.domain.enums.RecipientScope;
import com.popups.pupoo.notification.dto.AdminNotificationSaveCommand;
import com.popups.pupoo.notification.dto.AdminNotificationStoredItem;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Repository
public class AdminNotificationRepository {

    private final JdbcTemplate jdbcTemplate;

    public AdminNotificationRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<AdminNotificationStoredItem> rowMapper = (rs, rowNum) -> new AdminNotificationStoredItem(
            rs.getLong("admin_notification_id"),
            rs.getLong("admin_user_id"),
            readNullableLong(rs.getObject("notification_id")),
            rs.getString("title"),
            rs.getString("content"),
            AdminAlertMode.from(rs.getString("alert_mode")),
            NotificationType.valueOf(rs.getString("notification_type")),
            readNullableLong(rs.getObject("event_id")),
            rs.getString("event_name"),
            rs.getString("event_status"),
            rs.getString("alert_target_label"),
            rs.getString("special_target_key"),
            parseScopes(rs.getString("recipient_scopes")),
            readNullableInteger(rs.getObject("target_count")),
            AdminNotificationStatus.from(rs.getString("status")),
            toLocalDateTime(rs.getTimestamp("sent_at")),
            Objects.requireNonNull(toLocalDateTime(rs.getTimestamp("created_at"))),
            Objects.requireNonNull(toLocalDateTime(rs.getTimestamp("updated_at")))
    );

    public List<AdminNotificationStoredItem> findVisibleAll() {
        return jdbcTemplate.query("""
                SELECT admin_notification_id, admin_user_id, notification_id, title, content,
                       alert_mode, notification_type, event_id, event_name, event_status,
                       alert_target_label, special_target_key, recipient_scopes, target_count,
                       status, sent_at, created_at, updated_at
                FROM admin_notification
                WHERE deleted = 0
                ORDER BY created_at DESC, admin_notification_id DESC
                """, rowMapper);
    }

    public Optional<AdminNotificationStoredItem> findVisibleById(Long adminNotificationId) {
        List<AdminNotificationStoredItem> rows = jdbcTemplate.query("""
                SELECT admin_notification_id, admin_user_id, notification_id, title, content,
                       alert_mode, notification_type, event_id, event_name, event_status,
                       alert_target_label, special_target_key, recipient_scopes, target_count,
                       status, sent_at, created_at, updated_at
                FROM admin_notification
                WHERE admin_notification_id = ?
                  AND deleted = 0
                """, rowMapper, adminNotificationId);
        return rows.stream().findFirst();
    }

    public long countVisibleByStatus(AdminNotificationStatus status) {
        Long count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM admin_notification
                WHERE deleted = 0
                  AND status = ?
                """, Long.class, status.name());
        return count == null ? 0L : count;
    }

    public Long save(AdminNotificationSaveCommand command) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement("""
                    INSERT INTO admin_notification (
                        admin_user_id, notification_id, title, content,
                        alert_mode, notification_type, event_id, event_name, event_status,
                        alert_target_label, special_target_key, recipient_scopes,
                        target_count, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            int index = 1;
            ps.setLong(index++, command.adminUserId());
            ps.setNull(index++, Types.BIGINT);
            ps.setString(index++, command.title());
            ps.setString(index++, command.content());
            ps.setString(index++, command.alertMode().name());
            ps.setString(index++, command.notificationType().name());
            ps.setObject(index++, command.eventId(), Types.BIGINT);
            ps.setString(index++, command.eventName());
            ps.setString(index++, command.eventStatus());
            ps.setString(index++, command.alertTargetLabel());
            ps.setString(index++, blankToNull(command.specialTargetKey()));
            ps.setString(index++, joinScopes(command.recipientScopes()));
            ps.setObject(index++, command.targetCount(), Types.INTEGER);
            ps.setString(index++, command.status().name());
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("Failed to create admin notification");
        }
        return key.longValue();
    }

    public void update(Long adminNotificationId, AdminNotificationSaveCommand command) {
        jdbcTemplate.update("""
                UPDATE admin_notification
                SET title = ?,
                    content = ?,
                    alert_mode = ?,
                    notification_type = ?,
                    event_id = ?,
                    event_name = ?,
                    event_status = ?,
                    alert_target_label = ?,
                    special_target_key = ?,
                    recipient_scopes = ?,
                    target_count = ?,
                    status = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE admin_notification_id = ?
                  AND deleted = 0
                """,
                command.title(),
                command.content(),
                command.alertMode().name(),
                command.notificationType().name(),
                command.eventId(),
                command.eventName(),
                command.eventStatus(),
                command.alertTargetLabel(),
                blankToNull(command.specialTargetKey()),
                joinScopes(command.recipientScopes()),
                command.targetCount(),
                command.status().name(),
                adminNotificationId
        );
    }

    public void markSent(Long adminNotificationId, Long notificationId, Integer targetCount, LocalDateTime sentAt) {
        jdbcTemplate.update("""
                UPDATE admin_notification
                SET notification_id = ?,
                    target_count = ?,
                    status = 'SENT',
                    sent_at = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE admin_notification_id = ?
                  AND deleted = 0
                """,
                notificationId,
                targetCount,
                Timestamp.valueOf(sentAt),
                adminNotificationId
        );
    }

    public void softDelete(Long adminNotificationId) {
        jdbcTemplate.update("""
                UPDATE admin_notification
                SET deleted = 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE admin_notification_id = ?
                """, adminNotificationId);
    }

    private static String joinScopes(List<RecipientScope> scopes) {
        if (scopes == null || scopes.isEmpty()) {
            return null;
        }
        return scopes.stream()
                .map(RecipientScope::name)
                .collect(Collectors.joining(","));
    }

    private static List<RecipientScope> parseScopes(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(RecipientScope::valueOf)
                .toList();
    }

    private static LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }

    private static Long readNullableLong(Object value) {
        if (value == null) {
            return null;
        }
        return ((Number) value).longValue();
    }

    private static Integer readNullableInteger(Object value) {
        if (value == null) {
            return null;
        }
        return ((Number) value).intValue();
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value;
    }
}
