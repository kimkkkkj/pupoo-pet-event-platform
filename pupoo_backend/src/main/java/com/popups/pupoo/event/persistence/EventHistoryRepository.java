// file: src/main/java/com/popups/pupoo/event/persistence/EventHistoryRepository.java
package com.popups.pupoo.event.persistence;

import com.popups.pupoo.event.domain.model.EventHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventHistoryRepository extends JpaRepository<EventHistory, Long> {
}
