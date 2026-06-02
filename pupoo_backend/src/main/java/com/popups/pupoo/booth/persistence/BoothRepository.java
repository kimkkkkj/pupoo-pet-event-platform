// file: src/main/java/com/popups/pupoo/booth/persistence/BoothRepository.java
package com.popups.pupoo.booth.persistence;

import com.popups.pupoo.booth.domain.enums.BoothStatus;
import com.popups.pupoo.booth.domain.enums.BoothZone;
import com.popups.pupoo.booth.domain.model.Booth;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface BoothRepository extends JpaRepository<Booth, Long> {

    @Query("""
        select b
        from Booth b
        where b.eventId = :eventId
          and (:zone is null or b.zone = :zone)
          and (:status is null or b.status = :status)
        order by b.boothId asc
    """)
    Page<Booth> findEventBooths(
            @Param("eventId") Long eventId,
            @Param("zone") BoothZone zone,
            @Param("status") BoothStatus status,
            Pageable pageable
    );
}
