// file: src/main/java/com/popups/pupoo/booth/persistence/BoothCongestionQueryRepositoryImpl.java
package com.popups.pupoo.booth.persistence;

import com.popups.pupoo.booth.dto.BoothCongestionResponse;
import jakarta.persistence.*;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class BoothCongestionQueryRepositoryImpl implements BoothCongestionQueryRepository {

    private static final long REALTIME_CONGESTION_MAX_AGE_MINUTES = 30L;
    private static final long FUTURE_TOLERANCE_MINUTES = 5L;

    @PersistenceContext
    private EntityManager em;

    @Override
    public Optional<BoothCongestionResponse> findLatestByBoothId(Long boothId) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime freshnessFrom = now.minusMinutes(REALTIME_CONGESTION_MAX_AGE_MINUTES);
        LocalDateTime upperBound = now.plusMinutes(FUTURE_TOLERANCE_MINUTES);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                    select
                      c.congestion_level,
                      c.measured_at,
                      c.program_id
                    from congestions c
                    join event_program p on p.program_id = c.program_id
                    where p.booth_id = :boothId
                      and c.measured_at >= :freshnessFrom
                      and c.measured_at <= :upperBound
                    order by c.measured_at desc
                    limit 1
                """)
                .setParameter("boothId", boothId)
                .setParameter("freshnessFrom", freshnessFrom)
                .setParameter("upperBound", upperBound)
                .getResultList();

        if (rows.isEmpty()) {
            // If there is no "fresh" row (e.g. local seed data), fall back to the latest valid snapshot.
            rows = em.createNativeQuery("""
                        select
                          c.congestion_level,
                          c.measured_at,
                          c.program_id
                        from congestions c
                        join event_program p on p.program_id = c.program_id
                        where p.booth_id = :boothId
                          and c.measured_at <= :upperBound
                        order by c.measured_at desc
                        limit 1
                    """)
                    .setParameter("boothId", boothId)
                    .setParameter("upperBound", upperBound)
                    .getResultList();
        }

        if (rows.isEmpty()) return Optional.empty();

        Object[] r = rows.get(0);

        BoothCongestionResponse dto = new BoothCongestionResponse();
        dto.congestionLevel = r[0] == null ? null : ((Number) r[0]).intValue();
        dto.measuredAt = r[1] == null ? null : ((Timestamp) r[1]).toLocalDateTime();
        dto.programId = r[2] == null ? null : ((Number) r[2]).longValue();

        return Optional.of(dto);
    }
}
