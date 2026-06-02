package com.popups.pupoo.ai.persistence;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public class AiCongestionAggregationQueryRepositoryImpl implements AiCongestionAggregationQueryRepository {

    @PersistenceContext
    private EntityManager em;

    @Override
    public List<EventTargetRow> findEventTargets(LocalDateTime bucketTime) {
        String sql = """
            select e.event_id, e.start_at
            from event e
            where e.start_at <= :bucketTime
              and e.end_at >= :bucketTime
        """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("bucketTime", bucketTime)
                .getResultList();

        return rows.stream()
                .map(row -> new EventTargetRow(
                        toLong(row[0]),
                        toLocalDateTime(row[1])
                ))
                .toList();
    }

    @Override
    public List<ProgramTargetRow> findProgramTargets(LocalDateTime bucketTime) {
        String sql = """
            select p.program_id, p.event_id, p.booth_id, p.capacity, p.throughput_per_min, p.start_at
            from event_program p
            where p.start_at <= :bucketTime
              and p.end_at >= :bucketTime
        """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("bucketTime", bucketTime)
                .getResultList();

        return rows.stream()
                .map(row -> new ProgramTargetRow(
                        toLong(row[0]),
                        toLong(row[1]),
                        toLong(row[2]),
                        toInteger(row[3]),
                        toBigDecimal(row[4]),
                        toLocalDateTime(row[5])
                ))
                .toList();
    }

    @Override
    public List<EventQrLogCountRow> findEventQrLogCounts(LocalDateTime fromInclusive, LocalDateTime toExclusive) {
        String sql = """
            select
              q.event_id as event_id,
              sum(case when l.check_type = 'CHECKIN' then 1 else 0 end) as checkins,
              sum(case when l.check_type = 'CHECKOUT' then 1 else 0 end) as checkouts
            from qr_logs l
            join qr_codes q on q.qr_id = l.qr_id
            where l.checked_at >= :fromInclusive
              and l.checked_at < :toExclusive
            group by q.event_id
        """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("fromInclusive", fromInclusive)
                .setParameter("toExclusive", toExclusive)
                .getResultList();

        return rows.stream()
                .map(row -> new EventQrLogCountRow(
                        toLong(row[0]),
                        toInt(row[1]),
                        toInt(row[2])
                ))
                .toList();
    }

    @Override
    public List<BoothQrLogCountRow> findBoothQrLogCounts(LocalDateTime fromInclusive, LocalDateTime toExclusive) {
        String sql = """
            select
              l.booth_id as booth_id,
              sum(case when l.check_type = 'CHECKIN' then 1 else 0 end) as checkins,
              sum(case when l.check_type = 'CHECKOUT' then 1 else 0 end) as checkouts
            from qr_logs l
            where l.checked_at >= :fromInclusive
              and l.checked_at < :toExclusive
            group by l.booth_id
        """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("fromInclusive", fromInclusive)
                .setParameter("toExclusive", toExclusive)
                .getResultList();

        return rows.stream()
                .map(row -> new BoothQrLogCountRow(
                        toLong(row[0]),
                        toInt(row[1]),
                        toInt(row[2])
                ))
                .toList();
    }

    @Override
    public List<EventActiveApplyCountRow> findEventActiveApplyCounts() {
        String sql = """
            select ea.event_id, count(*) as active_apply_count
            from event_apply ea
            where ea.status in ('APPLIED', 'APPROVED')
            group by ea.event_id
        """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql).getResultList();

        return rows.stream()
                .map(row -> new EventActiveApplyCountRow(
                        toLong(row[0]),
                        toInt(row[1])
                ))
                .toList();
    }

    @Override
    public List<ProgramActiveApplyCountRow> findProgramActiveApplyCounts() {
        String sql = """
            select pa.program_id, count(*) as active_apply_count
            from event_program_apply pa
            where pa.status in ('APPLIED', 'WAITING', 'APPROVED')
            group by pa.program_id
        """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql).getResultList();

        return rows.stream()
                .map(row -> new ProgramActiveApplyCountRow(
                        toLong(row[0]),
                        toInt(row[1])
                ))
                .toList();
    }

    @Override
    public List<EventWaitAggregateRow> findEventWaitAggregates() {
        String sql = """
            select
              agg.event_id,
              sum(agg.wait_count_sum) as total_wait_count,
              coalesce(round(sum(agg.wait_min_sum) / nullif(sum(agg.wait_min_count), 0), 2), 0) as avg_wait_min
            from (
              select
                b.event_id as event_id,
                coalesce(sum(coalesce(bw.wait_count, 0)), 0) as wait_count_sum,
                coalesce(sum(case when bw.wait_min is not null then bw.wait_min else 0 end), 0) as wait_min_sum,
                coalesce(sum(case when bw.wait_min is not null then 1 else 0 end), 0) as wait_min_count
              from booths b
              left join booth_waits bw on bw.booth_id = b.booth_id
              group by b.event_id
              union all
              select
                p.event_id as event_id,
                coalesce(sum(coalesce(ew.wait_count, 0)), 0) as wait_count_sum,
                coalesce(sum(case when ew.wait_min is not null then ew.wait_min else 0 end), 0) as wait_min_sum,
                coalesce(sum(case when ew.wait_min is not null then 1 else 0 end), 0) as wait_min_count
              from event_program p
              left join experience_waits ew on ew.program_id = p.program_id
              group by p.event_id
            ) agg
            group by agg.event_id
        """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql).getResultList();

        return rows.stream()
                .map(row -> new EventWaitAggregateRow(
                        toLong(row[0]),
                        toInt(row[1]),
                        toBigDecimal(row[2])
                ))
                .toList();
    }

    @Override
    public List<ProgramWaitRow> findProgramWaits() {
        String sql = """
            select
              ew.program_id,
              coalesce(ew.wait_count, 0) as wait_count,
              coalesce(ew.wait_min, 0) as wait_min
            from experience_waits ew
        """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql).getResultList();

        return rows.stream()
                .map(row -> new ProgramWaitRow(
                        toLong(row[0]),
                        toInt(row[1]),
                        toInteger(row[2])
                ))
                .toList();
    }

    @Override
    public List<EventRunningProgramCountRow> findRunningProgramCounts(LocalDateTime bucketTime) {
        String sql = """
            select
              p.event_id,
              count(*) as running_program_count
            from event_program p
            where p.start_at <= :bucketTime
              and p.end_at > :bucketTime
            group by p.event_id
        """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("bucketTime", bucketTime)
                .getResultList();

        return rows.stream()
                .map(row -> new EventRunningProgramCountRow(
                        toLong(row[0]),
                        toInt(row[1])
                ))
                .toList();
    }

    @Override
    public List<EventTotalProgramCountRow> findTotalProgramCounts() {
        String sql = """
            select
              p.event_id,
              count(*) as total_program_count
            from event_program p
            group by p.event_id
        """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql).getResultList();

        return rows.stream()
                .map(row -> new EventTotalProgramCountRow(
                        toLong(row[0]),
                        toInt(row[1])
                ))
                .toList();
    }

    @Override
    public List<ProgramCheckinCountRow> findProgramCheckinCounts(
            Collection<Long> programIds,
            LocalDateTime fromInclusive,
            LocalDateTime toExclusive
    ) {
        if (programIds == null || programIds.isEmpty()) {
            return List.of();
        }

        String sql = """
            select
              pa.program_id,
              count(*) as checkin_count
            from event_program_apply pa
            where pa.program_id in (:programIds)
              and pa.checked_in_at >= :fromInclusive
              and pa.checked_in_at < :toExclusive
            group by pa.program_id
        """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("programIds", programIds)
                .setParameter("fromInclusive", fromInclusive)
                .setParameter("toExclusive", toExclusive)
                .getResultList();

        return rows.stream()
                .map(row -> new ProgramCheckinCountRow(
                        toLong(row[0]),
                        toInt(row[1])
                ))
                .toList();
    }

    private Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(value.toString());
    }

    private int toInt(Object value) {
        if (value == null) {
            return 0;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        return Integer.parseInt(value.toString());
    }

    private Integer toInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        return Integer.parseInt(value.toString());
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        return new BigDecimal(value.toString());
    }

    private LocalDateTime toLocalDateTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDateTime dateTime) {
            return dateTime;
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime();
        }
        return LocalDateTime.parse(value.toString());
    }
}
