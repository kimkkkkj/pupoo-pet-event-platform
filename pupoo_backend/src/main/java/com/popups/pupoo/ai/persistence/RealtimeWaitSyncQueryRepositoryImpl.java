package com.popups.pupoo.ai.persistence;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public class RealtimeWaitSyncQueryRepositoryImpl implements RealtimeWaitSyncQueryRepository {

    @PersistenceContext
    private EntityManager em;

    @Override
    public List<RunningProgramRow> findRunningPrograms(LocalDateTime baseTime) {
        String sql = """
            select
              p.program_id,
              p.booth_id,
              p.capacity,
              p.throughput_per_min
            from event_program p
            join event e on e.event_id = p.event_id
            where p.start_at <= :baseTime
              and p.end_at > :baseTime
              and p.category = 'EXPERIENCE'
              and e.start_at <= :baseTime
              and e.end_at > :baseTime
        """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("baseTime", baseTime)
                .getResultList();

        return rows.stream()
                .map(row -> new RunningProgramRow(
                        toLong(row[0]),
                        toLong(row[1]),
                        toInteger(row[2]),
                        toBigDecimal(row[3])
                ))
                .toList();
    }

    @Override
    public List<ProgramQueueCountRow> findProgramQueueCounts(Collection<Long> programIds) {
        if (programIds == null || programIds.isEmpty()) {
            return List.of();
        }

        String sql = """
            select
              pa.program_id,
              count(*) as queue_count
            from event_program_apply pa
            where pa.program_id in (:programIds)
              and pa.status in ('WAITING', 'APPROVED')
            group by pa.program_id
        """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("programIds", programIds)
                .getResultList();

        return rows.stream()
                .map(row -> new ProgramQueueCountRow(
                        toLong(row[0]),
                        toInt(row[1])
                ))
                .toList();
    }

    @Override
    public List<ProgramAppliedCountRow> findProgramAppliedCounts(Collection<Long> programIds) {
        if (programIds == null || programIds.isEmpty()) {
            return List.of();
        }

        String sql = """
            select
              pa.program_id,
              count(*) as applied_count
            from event_program_apply pa
            where pa.program_id in (:programIds)
              and pa.status = 'APPLIED'
            group by pa.program_id
        """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("programIds", programIds)
                .getResultList();

        return rows.stream()
                .map(row -> new ProgramAppliedCountRow(
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

    @Override
    public List<BoothAverageStayRow> findRecentBoothAverageStays(
            Collection<Long> boothIds,
            LocalDateTime fromInclusive,
            LocalDateTime toExclusive,
            int sampleSize
    ) {
        if (boothIds == null || boothIds.isEmpty()) {
            return List.of();
        }

        int normalizedSampleSize = Math.max(sampleSize, 1);

        String sql = """
            with paired as (
              select
                ci.booth_id as booth_id,
                ci.checked_at as checkin_at,
                (
                  select min(co.checked_at)
                  from qr_logs co
                  where co.qr_id = ci.qr_id
                    and co.booth_id = ci.booth_id
                    and co.check_type = 'CHECKOUT'
                    and co.checked_at > ci.checked_at
                ) as checkout_at
              from qr_logs ci
              where ci.booth_id in (:boothIds)
                and ci.check_type = 'CHECKIN'
                and ci.checked_at >= :fromInclusive
                and ci.checked_at < :toExclusive
            ),
            ranked as (
              select
                booth_id,
                timestampdiff(second, checkin_at, checkout_at) / 60.0 as stay_minutes,
                row_number() over (
                  partition by booth_id
                  order by checkout_at desc, checkin_at desc
                ) as rn
              from paired
              where checkout_at is not null
                and timestampdiff(second, checkin_at, checkout_at) > 0
            )
            select
              booth_id,
              avg(stay_minutes) as avg_stay_minutes,
              count(*) as sample_count
            from ranked
            where rn <= :sampleSize
            group by booth_id
        """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("boothIds", boothIds)
                .setParameter("fromInclusive", fromInclusive)
                .setParameter("toExclusive", toExclusive)
                .setParameter("sampleSize", normalizedSampleSize)
                .getResultList();

        return rows.stream()
                .map(row -> new BoothAverageStayRow(
                        toLong(row[0]),
                        toBigDecimal(row[1]),
                        toInt(row[2])
                ))
                .toList();
    }

    @Override
    public List<ActiveBoothRow> findActiveBooths(LocalDateTime baseTime) {
        String sql = """
            select
              b.booth_id,
              greatest(
                coalesce(
                  sum(
                    case
                      when p.start_at <= :baseTime and p.end_at > :baseTime
                        then 1
                      else 0
                    end
                  ),
                  0
                ),
                1
              ) as concurrency
            from booths b
            join event e on e.event_id = b.event_id
            left join event_program p on p.booth_id = b.booth_id
            where e.start_at <= :baseTime
              and e.end_at > :baseTime
              and b.status <> 'CLOSED'
            group by b.booth_id
        """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("baseTime", baseTime)
                .getResultList();

        return rows.stream()
                .map(row -> new ActiveBoothRow(
                        toLong(row[0]),
                        toInteger(row[1])
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
            return null;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        return new BigDecimal(value.toString());
    }
}
