// file: src/main/java/com/popups/pupoo/program/persistence/ProgramRepository.java
package com.popups.pupoo.program.persistence;

import com.popups.pupoo.program.domain.enums.ProgramCategory;
import com.popups.pupoo.program.domain.model.Program;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProgramRepository extends JpaRepository<Program, Long> {

    Page<Program> findByEventId(Long eventId, Pageable pageable);

    Page<Program> findByEventIdAndCategory(Long eventId, ProgramCategory category, Pageable pageable);

    Optional<Program> findFirstByEventIdAndImageUrlIsNotNullOrderByProgramIdAsc(Long eventId);
}
