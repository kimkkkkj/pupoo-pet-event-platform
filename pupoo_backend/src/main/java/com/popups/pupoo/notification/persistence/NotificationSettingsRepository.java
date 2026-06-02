// file: src/main/java/com/popups/pupoo/notification/persistence/NotificationSettingsRepository.java
package com.popups.pupoo.notification.persistence;

import com.popups.pupoo.notification.domain.model.NotificationSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationSettingsRepository extends JpaRepository<NotificationSettings, Long> {
}
