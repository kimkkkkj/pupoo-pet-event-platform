// file: src/main/java/com/popups/pupoo/notification/persistence/NotificationRepository.java
package com.popups.pupoo.notification.persistence;

import com.popups.pupoo.notification.domain.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
}
