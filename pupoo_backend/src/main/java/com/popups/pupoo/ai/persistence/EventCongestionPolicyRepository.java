package com.popups.pupoo.ai.persistence;

import com.popups.pupoo.ai.domain.model.EventCongestionPolicy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface EventCongestionPolicyRepository extends JpaRepository<EventCongestionPolicy, Long> {

    List<EventCongestionPolicy> findAllByEventIdIn(Collection<Long> eventIds);
}
