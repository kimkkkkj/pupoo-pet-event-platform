// file: src/main/java/com/popups/pupoo/program/speaker/persistence/SpeakerRepository.java
package com.popups.pupoo.program.speaker.persistence;

import com.popups.pupoo.program.speaker.domain.model.Speaker;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpeakerRepository extends JpaRepository<Speaker, Long> {

    List<Speaker> findAllByOrderBySpeakerIdDesc();
}