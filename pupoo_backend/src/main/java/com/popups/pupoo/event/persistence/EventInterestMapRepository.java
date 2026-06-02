// file: src/main/java/com/popups/pupoo/event/persistence/EventInterestMapRepository.java
package com.popups.pupoo.event.persistence;

import com.popups.pupoo.event.domain.model.EventInterestMap;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventInterestMapRepository extends JpaRepository<EventInterestMap, Long> {

    int deleteByEventId(Long eventId);

    List<EventInterestMap> findByEventId(Long eventId);
}
