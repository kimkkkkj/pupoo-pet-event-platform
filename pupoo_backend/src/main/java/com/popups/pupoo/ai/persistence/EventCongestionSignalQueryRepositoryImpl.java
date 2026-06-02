package com.popups.pupoo.ai.persistence;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public class EventCongestionSignalQueryRepositoryImpl implements EventCongestionSignalQueryRepository {

    private static final double NEUTRAL_SCORE = 50.0;

    @PersistenceContext
    private EntityManager em;

    @Override
    public EventSignalSnapshot collectEventSignalSnapshot(Long eventId, LocalDateTime baseTime) {
        LocalDateTime from30m = baseTime.minusMinutes(30);
        LocalDateTime from60m = baseTime.minusMinutes(60);
        LocalDateTime from1d = baseTime.minusDays(1);
        LocalDateTime from7d = baseTime.minusDays(7);
        LocalDateTime from180d = baseTime.minusDays(180);

        ApplyMetrics applyMetrics = fetchApplyMetrics(eventId, baseTime, from1d, from7d);
        ProgramApplyMetrics programApplyMetrics = fetchProgramApplyMetrics(eventId);

        double applicationTrendScore = computeApplicationTrendScore(applyMetrics);
        double applyConversionScore = computeApplyConversionScore(programApplyMetrics);
        double queueOperationScore = computeQueueOperationScore(programApplyMetrics);
        double zoneDensityScore = computeZoneDensityScore(eventId, from30m, baseTime);
        double stayTimeScore = computeStayTimeScore(eventId, from1d, baseTime);
        double manualCongestionScore = computeManualCongestionScore(eventId, from60m, baseTime);
        double revisitScore = computeRevisitScore(eventId, from180d, baseTime);
        double voteHeatScore = computeVoteHeatScore(eventId);
        double paymentIntentScore = computePaymentIntentScore(eventId);

        return new EventSignalSnapshot(
                applicationTrendScore,
                applyConversionScore,
                queueOperationScore,
                zoneDensityScore,
                stayTimeScore,
                manualCongestionScore,
                revisitScore,
                voteHeatScore,
                paymentIntentScore
        );
    }

    private ApplyMetrics fetchApplyMetrics(
            Long eventId,
            LocalDateTime baseTime,
            LocalDateTime from1d,
            LocalDateTime from7d
    ) {
        Object[] row = (Object[]) em.createNativeQuery("""
                    select
                      sum(case when status in ('APPLIED','APPROVED')
                                and applied_at >= :from1d
                                and applied_at <= :baseTime then 1 else 0 end) as active_1d,
                      sum(case when status in ('APPLIED','APPROVED')
                                and applied_at >= :from7d
                                and applied_at <= :baseTime then 1 else 0 end) as active_7d,
                      sum(case when status = 'APPROVED' then 1 else 0 end) as approved_count,
                      sum(case when status = 'CANCELLED' then 1 else 0 end) as cancelled_count,
                      count(*) as total_count
                    from event_apply
                    where event_id = :eventId
                """)
                .setParameter("eventId", eventId)
                .setParameter("baseTime", baseTime)
                .setParameter("from1d", from1d)
                .setParameter("from7d", from7d)
                .getSingleResult();

        return new ApplyMetrics(
                toLong(row[0]),
                toLong(row[1]),
                toLong(row[2]),
                toLong(row[3]),
                toLong(row[4])
        );
    }

    private ProgramApplyMetrics fetchProgramApplyMetrics(Long eventId) {
        Object[] row = (Object[]) em.createNativeQuery("""
                    select
                      sum(case when pa.status = 'WAITING' then 1 else 0 end) as waiting_count,
                      sum(case when pa.status = 'APPROVED' then 1 else 0 end) as approved_count,
                      sum(case when pa.status = 'CHECKED_IN' then 1 else 0 end) as checked_in_count,
                      sum(case when pa.status = 'CANCELLED' then 1 else 0 end) as cancelled_count,
                      count(*) as total_count,
                      avg(case when pa.eta_min is not null and pa.eta_min > 0 then pa.eta_min end) as avg_eta_min,
                      sum(case when pa.notified_at is not null then 1 else 0 end) as notified_count
                    from event_program_apply pa
                    join event_program p on p.program_id = pa.program_id
                    where p.event_id = :eventId
                """)
                .setParameter("eventId", eventId)
                .getSingleResult();

        return new ProgramApplyMetrics(
                toLong(row[0]),
                toLong(row[1]),
                toLong(row[2]),
                toLong(row[3]),
                toLong(row[4]),
                toDouble(row[5], -1.0),
                toLong(row[6])
        );
    }

    private double computeApplicationTrendScore(ApplyMetrics metrics) {
        if (metrics.totalCount <= 0) {
            return 0.0;
        }
        double avgDaily = metrics.active7d / 7.0;
        double trendRatio = avgDaily <= 0.0 ? 0.0 : (metrics.active1d / avgDaily);
        double trendScore = clamp100((trendRatio / 2.0) * 100.0);
        double approvalRate = metrics.approvedCount / (double) metrics.totalCount;
        double cancelRate = metrics.cancelledCount / (double) metrics.totalCount;

        double score = (trendScore * 0.45)
                + (approvalRate * 100.0 * 0.35)
                + ((100.0 - (cancelRate * 100.0)) * 0.20);
        return roundOne(clamp100(score));
    }

    private double computeApplyConversionScore(ProgramApplyMetrics metrics) {
        if (metrics.totalCount <= 0) {
            return NEUTRAL_SCORE;
        }

        double approvalRate = metrics.approvedCount / (double) metrics.totalCount;
        double checkinBase = Math.max(metrics.approvedCount + metrics.checkedInCount, 1L);
        double checkinRate = metrics.checkedInCount / checkinBase;
        double cancelRate = metrics.cancelledCount / (double) metrics.totalCount;

        double score = (approvalRate * 100.0 * 0.45)
                + (checkinRate * 100.0 * 0.40)
                + ((100.0 - (cancelRate * 100.0)) * 0.15);
        return roundOne(clamp100(score));
    }

    private double computeQueueOperationScore(ProgramApplyMetrics metrics) {
        if (metrics.totalCount <= 0) {
            return NEUTRAL_SCORE;
        }

        double etaScore = metrics.avgEtaMin < 0.0
                ? NEUTRAL_SCORE
                : clamp100(100.0 - ((metrics.avgEtaMin / 60.0) * 100.0));
        double notifiedRate = metrics.notifiedCount / (double) metrics.totalCount;
        double score = (etaScore * 0.60) + (notifiedRate * 100.0 * 0.40);
        return roundOne(clamp100(score));
    }

    private double computeZoneDensityScore(Long eventId, LocalDateTime from30m, LocalDateTime baseTime) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                    select b.zone, count(*) as cnt
                    from qr_logs l
                    join qr_codes q on q.qr_id = l.qr_id
                    join booths b on b.booth_id = l.booth_id
                    where q.event_id = :eventId
                      and l.check_type = 'CHECKIN'
                      and l.checked_at >= :from30m
                      and l.checked_at <= :baseTime
                    group by b.zone
                """)
                .setParameter("eventId", eventId)
                .setParameter("from30m", from30m)
                .setParameter("baseTime", baseTime)
                .getResultList();

        long total = 0L;
        long maxZone = 0L;
        for (Object[] row : rows) {
            long count = toLong(row[1]);
            total += count;
            if (count > maxZone) {
                maxZone = count;
            }
        }
        if (total <= 0L) {
            return NEUTRAL_SCORE;
        }

        double maxShare = maxZone / (double) total;
        double concentrationScore = clamp100(maxShare * 100.0);
        double flowScore = clamp100((total / 60.0) * 100.0);
        return roundOne(clamp100((concentrationScore * 0.55) + (flowScore * 0.45)));
    }

    private double computeStayTimeScore(Long eventId, LocalDateTime from1d, LocalDateTime baseTime) {
        Object value = em.createNativeQuery("""
                    select avg(timestampdiff(minute, ci.checked_at, co.checked_at))
                    from qr_logs ci
                    join qr_codes q on q.qr_id = ci.qr_id
                    join qr_logs co
                      on co.qr_id = ci.qr_id
                     and co.check_type = 'CHECKOUT'
                     and co.checked_at > ci.checked_at
                    left join qr_logs co_prev
                      on co_prev.qr_id = ci.qr_id
                     and co_prev.check_type = 'CHECKOUT'
                     and co_prev.checked_at > ci.checked_at
                     and co_prev.checked_at < co.checked_at
                    where q.event_id = :eventId
                      and ci.check_type = 'CHECKIN'
                      and ci.checked_at >= :from1d
                      and ci.checked_at <= :baseTime
                      and co_prev.log_id is null
                """)
                .setParameter("eventId", eventId)
                .setParameter("from1d", from1d)
                .setParameter("baseTime", baseTime)
                .getSingleResult();

        if (value == null) {
            return NEUTRAL_SCORE;
        }
        double avgStayMinutes = toDouble(value, 0.0);
        double score = clamp100((avgStayMinutes / 90.0) * 100.0);
        return roundOne(score);
    }

    private double computeManualCongestionScore(Long eventId, LocalDateTime from60m, LocalDateTime baseTime) {
        Object recent = em.createNativeQuery("""
                    select avg(c.congestion_level) * 20.0
                    from congestions c
                    join event_program p on p.program_id = c.program_id
                    where p.event_id = :eventId
                      and c.measured_at >= :from60m
                      and c.measured_at <= :baseTime
                """)
                .setParameter("eventId", eventId)
                .setParameter("from60m", from60m)
                .setParameter("baseTime", baseTime)
                .getSingleResult();

        if (recent != null) {
            return roundOne(clamp100(toDouble(recent, NEUTRAL_SCORE)));
        }

        Object fallback = em.createNativeQuery("""
                    select avg(c.congestion_level) * 20.0
                    from congestions c
                    join event_program p on p.program_id = c.program_id
                    where p.event_id = :eventId
                      and c.measured_at >= :from7d
                      and c.measured_at <= :baseTime
                """)
                .setParameter("eventId", eventId)
                .setParameter("from7d", baseTime.minusDays(7))
                .setParameter("baseTime", baseTime)
                .getSingleResult();
        if (fallback == null) {
            return NEUTRAL_SCORE;
        }
        return roundOne(clamp100(toDouble(fallback, NEUTRAL_SCORE)));
    }

    private double computeRevisitScore(Long eventId, LocalDateTime from180d, LocalDateTime baseTime) {
        Object value = em.createNativeQuery("""
                    select count(distinct eh.user_id)
                    from event_history eh
                    where eh.event_id = :eventId
                      and eh.joined_at >= :from180d
                      and eh.joined_at <= :baseTime
                """)
                .setParameter("eventId", eventId)
                .setParameter("from180d", from180d)
                .setParameter("baseTime", baseTime)
                .getSingleResult();

        long revisitUsers = toLong(value);
        if (revisitUsers <= 0L) {
            return NEUTRAL_SCORE;
        }
        return roundOne(clamp100((revisitUsers / 500.0) * 100.0));
    }

    private double computeVoteHeatScore(Long eventId) {
        Object value = em.createNativeQuery("""
                    select count(*)
                    from contest_votes v
                    join event_program p on p.program_id = v.program_id
                    where p.event_id = :eventId
                      and v.status = 'ACTIVE'
                """)
                .setParameter("eventId", eventId)
                .getSingleResult();

        long activeVotes = toLong(value);
        if (activeVotes <= 0L) {
            return NEUTRAL_SCORE;
        }
        return roundOne(clamp100((activeVotes / 300.0) * 100.0));
    }

    private double computePaymentIntentScore(Long eventId) {
        Object[] paymentRow = (Object[]) em.createNativeQuery("""
                    select
                      sum(case when status = 'APPROVED' then 1 else 0 end) as approved_count,
                      count(*) as total_count
                    from payments
                    where event_id = :eventId
                """)
                .setParameter("eventId", eventId)
                .getSingleResult();

        long approved = toLong(paymentRow[0]);
        long total = toLong(paymentRow[1]);
        if (total <= 0L) {
            return NEUTRAL_SCORE;
        }

        Object refundValue = em.createNativeQuery("""
                    select count(*)
                    from refunds r
                    join payments p on p.payment_id = r.payment_id
                    where p.event_id = :eventId
                      and r.status = 'COMPLETED'
                """)
                .setParameter("eventId", eventId)
                .getSingleResult();
        long completedRefunds = toLong(refundValue);

        double successRate = approved / (double) total;
        double refundRate = completedRefunds / (double) total;
        double rawScore = clamp100((successRate * 100.0) - (refundRate * 50.0));

        double reliability = Math.min(1.0, total / 50.0);
        double stabilized = (rawScore * reliability) + (NEUTRAL_SCORE * (1.0 - reliability));
        return roundOne(clamp100(stabilized));
    }

    private long toLong(Object value) {
        if (value == null) {
            return 0L;
        }
        return ((Number) value).longValue();
    }

    private double toDouble(Object value, double fallback) {
        if (value == null) {
            return fallback;
        }
        return ((Number) value).doubleValue();
    }

    private double clamp100(double value) {
        return Math.max(0.0, Math.min(100.0, value));
    }

    private double roundOne(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private record ApplyMetrics(
            long active1d,
            long active7d,
            long approvedCount,
            long cancelledCount,
            long totalCount
    ) {
    }

    private record ProgramApplyMetrics(
            long waitingCount,
            long approvedCount,
            long checkedInCount,
            long cancelledCount,
            long totalCount,
            double avgEtaMin,
            long notifiedCount
    ) {
    }
}
