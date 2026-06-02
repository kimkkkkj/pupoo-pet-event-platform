// file: src/main/java/com.popups.pupoo.common.dashboard.analytics/persistence/AdminAnalyticsQueryRepositoryImpl.java
package com.popups.pupoo.common.dashboard.analytics.persistence;

import com.popups.pupoo.common.dashboard.analytics.dto.AdminCongestionByHourResponse;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public class AdminAnalyticsQueryRepositoryImpl implements AdminAnalyticsQueryRepository {

    @PersistenceContext
    private EntityManager em;

    @Override
    public List<AdminCongestionByHourResponse> findAvgCongestionByHour(Long eventId) {
        String sql = """
            select
              hour(c.measured_at) as h,
              avg(c.congestion_level) as avg_level
            from congestions c
            join event_program p on p.program_id = c.program_id
            where p.event_id = :eventId
              and c.measured_at <= :now
            group by hour(c.measured_at)
            order by h asc
        """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("eventId", eventId)
                .setParameter("now", LocalDateTime.now())
                .getResultList();

        return rows.stream()
                .map(r -> new AdminCongestionByHourResponse(
                        r[0] == null ? 0 : ((Number) r[0]).intValue(),
                        r[1] == null ? 0.0 : ((Number) r[1]).doubleValue()
                ))
                .toList();
    }
}
