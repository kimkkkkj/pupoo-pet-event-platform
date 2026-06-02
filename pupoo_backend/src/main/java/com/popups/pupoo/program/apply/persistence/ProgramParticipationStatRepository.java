// file: src/main/java/com/popups/pupoo/program/apply/persistence/ProgramParticipationStatRepository.java
package com.popups.pupoo.program.apply.persistence;

import com.popups.pupoo.program.apply.domain.model.ProgramParticipationStat;
import com.popups.pupoo.program.apply.domain.model.ProgramParticipationStat.Pk;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProgramParticipationStatRepository extends JpaRepository<ProgramParticipationStat, Pk> {

    Optional<ProgramParticipationStat> findByUserIdAndProgramId(Long userId, Long programId);
}
