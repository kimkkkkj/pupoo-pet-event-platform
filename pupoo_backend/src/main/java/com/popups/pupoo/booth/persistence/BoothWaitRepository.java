// file: src/main/java/com/popups/pupoo/booth/persistence/BoothWaitRepository.java
package com.popups.pupoo.booth.persistence;

import com.popups.pupoo.booth.domain.model.BoothWait;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BoothWaitRepository extends JpaRepository<BoothWait, Long> {
    Optional<BoothWait> findByBoothId(Long boothId);
    List<BoothWait> findAllByBoothIdIn(Collection<Long> boothIds);
}
