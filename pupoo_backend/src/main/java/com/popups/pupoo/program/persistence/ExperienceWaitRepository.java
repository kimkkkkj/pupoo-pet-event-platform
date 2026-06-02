// file: src/main/java/com/popups/pupoo/program/persistence/ExperienceWaitRepository.java
package com.popups.pupoo.program.persistence;

import com.popups.pupoo.program.domain.model.ExperienceWait;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ExperienceWaitRepository extends JpaRepository<ExperienceWait, Long> {

    Optional<ExperienceWait> findByProgramId(Long programId);
    List<ExperienceWait> findAllByProgramIdIn(Collection<Long> programIds);
}
