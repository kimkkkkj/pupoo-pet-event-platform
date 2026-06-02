package com.popups.pupoo.ai.persistence;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public class AiEventCongestionBaselineQueryRepositoryImpl implements AiEventCongestionBaselineQueryRepository {

    @PersistenceContext
    private EntityManager em;

    @Override
    public Double findEndedAverageScorePercent(LocalDateTime fromInclusive, LocalDateTime toInclusive) {
        return findAverageScorePercentByStatus("ENDED", fromInclusive, toInclusive);
    }

    @Override
    public Double findOngoingAverageScorePercent(LocalDateTime fromInclusive, LocalDateTime toInclusive) {
        return findAverageScorePercentByStatus("ONGOING", fromInclusive, toInclusive);
    }

    private Double findAverageScorePercentByStatus(
            String eventStatus,
            LocalDateTime fromInclusive,
            LocalDateTime toInclusive
    ) {
        Object value = em.createNativeQuery("""
                    select avg(c.congestion_level) * 20.0
                    from congestions c
                    join event_program p on p.program_id = c.program_id
                    join event e on e.event_id = p.event_id
                    where e.status = :eventStatus
                      and c.congestion_level between 1 and 5
                      and c.measured_at >= :fromInclusive
                      and c.measured_at <= :toInclusive
                """)
                .setParameter("eventStatus", eventStatus)
                .setParameter("fromInclusive", fromInclusive)
                .setParameter("toInclusive", toInclusive)
                .getSingleResult();

        if (value == null) {
            return null;
        }
        return ((Number) value).doubleValue();
    }
}
