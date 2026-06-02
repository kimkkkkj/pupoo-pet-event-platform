package com.popups.pupoo.common.dashboard.persistence;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public class AdminRealtimeAggregateQueryRepositoryImpl implements AdminRealtimeAggregateQueryRepository {

    @PersistenceContext
    private EntityManager em;

    @Override
    public List<EventRegistrationSummaryRow> findEventRegistrationSummaries() {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                select
                  ea.event_id,
                  count(*) as total_applicants,
                  sum(case when ea.status = 'APPLIED' then 1 else 0 end) as applied_count,
                  sum(case when ea.status = 'APPROVED' then 1 else 0 end) as approved_count
                from event_apply ea
                group by ea.event_id
                """).getResultList();

        return rows.stream()
                .map(row -> new EventRegistrationSummaryRow(
                        toLongObj(row[0]),
                        toLong(row[1]),
                        toLong(row[2]),
                        toLong(row[3])
                ))
                .toList();
    }

    @Override
    public List<EventQrSummaryRow> findEventQrSummaries() {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                select
                  q.event_id,
                  count(distinct q.qr_id) as issued_qr_count,
                  sum(case when l.check_type = 'CHECKIN' then 1 else 0 end) as total_checkins,
                  sum(case when l.check_type = 'CHECKOUT' then 1 else 0 end) as total_checkouts,
                  max(case when l.check_type = 'CHECKIN' then l.checked_at else null end) as latest_checkin_at,
                  max(l.checked_at) as latest_checked_at
                from qr_codes q
                left join qr_logs l on l.qr_id = q.qr_id
                group by q.event_id
                """).getResultList();

        return rows.stream()
                .map(row -> new EventQrSummaryRow(
                        toLongObj(row[0]),
                        toLong(row[1]),
                        toLong(row[2]),
                        toLong(row[3]),
                        toDateTime(row[4]),
                        toDateTime(row[5])
                ))
                .toList();
    }

    @Override
    public List<EventWaitingSummaryRow> findBoothWaitingSummariesByEvent() {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                select
                  b.event_id,
                  coalesce(sum(w.wait_count), 0) as waiting_count,
                  avg(w.wait_min) as avg_wait_min,
                  max(w.wait_min) as longest_wait_min
                from booths b
                left join booth_waits w on w.booth_id = b.booth_id
                group by b.event_id
                """).getResultList();

        return rows.stream()
                .map(row -> new EventWaitingSummaryRow(
                        toLongObj(row[0]),
                        toLong(row[1]),
                        toDoubleObj(row[2]),
                        toIntObj(row[3])
                ))
                .toList();
    }

    @Override
    public List<EventWaitingSummaryRow> findProgramWaitingSummariesByEvent() {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                select
                  p.event_id,
                  coalesce(sum(w.wait_count), 0) as waiting_count,
                  avg(w.wait_min) as avg_wait_min,
                  max(w.wait_min) as longest_wait_min
                from event_program p
                left join experience_waits w on w.program_id = p.program_id
                where p.category = 'EXPERIENCE'
                group by p.event_id
                """).getResultList();

        return rows.stream()
                .map(row -> new EventWaitingSummaryRow(
                        toLongObj(row[0]),
                        toLong(row[1]),
                        toDoubleObj(row[2]),
                        toIntObj(row[3])
                ))
                .toList();
    }

    @Override
    public List<EventVoteSummaryRow> findEventVoteSummaries() {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                select
                  p.event_id,
                  count(v.vote_id) as total_votes,
                  max(v.voted_at) as latest_vote_at
                from event_program p
                left join contest_votes v
                  on v.program_id = p.program_id
                 and v.status = 'ACTIVE'
                where p.category = 'CONTEST'
                group by p.event_id
                """).getResultList();

        return rows.stream()
                .map(row -> new EventVoteSummaryRow(
                        toLongObj(row[0]),
                        toLong(row[1]),
                        toDateTime(row[2])
                ))
                .toList();
    }

    @Override
    public List<EventProgramCountRow> findEventProgramCounts() {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                select
                  p.event_id,
                  count(*) as total_programs,
                  sum(case when p.category = 'CONTEST' then 1 else 0 end) as contest_programs,
                  sum(
                    case
                      when p.start_at <= now() and p.end_at >= now() then 1
                      else 0
                    end
                  ) as active_programs
                from event_program p
                group by p.event_id
                """).getResultList();

        return rows.stream()
                .map(row -> new EventProgramCountRow(
                        toLongObj(row[0]),
                        toLong(row[1]),
                        toLong(row[2]),
                        toLong(row[3])
                ))
                .toList();
    }

    @Override
    public List<EventCongestionSummaryRow> findEventCongestionSummaries() {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                with ranked as (
                  select
                    p.event_id,
                    p.booth_id,
                    c.congestion_level,
                    row_number() over (
                      partition by p.booth_id
                      order by c.measured_at desc
                    ) as rn
                  from event_program p
                  left join congestions c on c.program_id = p.program_id
                  where p.booth_id is not null
                )
                select
                  r.event_id,
                  round(avg(r.congestion_level) * 20, 0) as avg_congestion_percent
                from ranked r
                where r.rn = 1
                  and r.congestion_level is not null
                group by r.event_id
                """).getResultList();

        return rows.stream()
                .map(row -> new EventCongestionSummaryRow(
                        toLongObj(row[0]),
                        toIntObj(row[1])
                ))
                .toList();
    }

    @Override
    public List<RegistrationStatusCountRow> findRegistrationStatusCounts(Long eventId) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                select
                  ea.status,
                  count(*) as count_value
                from event_apply ea
                where ea.event_id = :eventId
                group by ea.status
                """)
                .setParameter("eventId", eventId)
                .getResultList();

        return rows.stream()
                .map(row -> new RegistrationStatusCountRow(
                        String.valueOf(row[0]),
                        toLong(row[1])
                ))
                .toList();
    }

    @Override
    public List<ProgramApplyStatusCountRow> findProgramApplyStatusCounts(Long eventId) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                select
                  pa.program_id,
                  pa.status,
                  count(*) as count_value
                from event_program_apply pa
                join event_program p on p.program_id = pa.program_id
                where p.event_id = :eventId
                group by pa.program_id, pa.status
                """)
                .setParameter("eventId", eventId)
                .getResultList();

        return rows.stream()
                .map(row -> new ProgramApplyStatusCountRow(
                        toLongObj(row[0]),
                        String.valueOf(row[1]),
                        toLong(row[2])
                ))
                .toList();
    }

    @Override
    public List<ProgramCheckedInCountRow> findProgramCheckedInCounts(Long eventId) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                select
                  pa.program_id,
                  count(*) as checked_in_count
                from event_program_apply pa
                join event_program p on p.program_id = pa.program_id
                where p.event_id = :eventId
                  and pa.checked_in_at is not null
                group by pa.program_id
                """)
                .setParameter("eventId", eventId)
                .getResultList();

        return rows.stream()
                .map(row -> new ProgramCheckedInCountRow(
                        toLongObj(row[0]),
                        toLong(row[1])
                ))
                .toList();
    }

    @Override
    public List<RecentCheckinLogRow> findRecentCheckinLogs(Long eventId, int limit) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                select
                  l.log_id,
                  q.qr_id,
                  b.booth_id,
                  b.place_name,
                  l.check_type,
                  l.checked_at
                from qr_logs l
                join qr_codes q on q.qr_id = l.qr_id
                join booths b on b.booth_id = l.booth_id
                where q.event_id = :eventId
                order by l.checked_at desc, l.log_id desc
                """)
                .setParameter("eventId", eventId)
                .setMaxResults(Math.max(1, limit))
                .getResultList();

        return rows.stream()
                .map(row -> new RecentCheckinLogRow(
                        toLongObj(row[0]),
                        toLongObj(row[1]),
                        toLongObj(row[2]),
                        toStringOrNull(row[3]),
                        toStringOrNull(row[4]),
                        toDateTime(row[5])
                ))
                .toList();
    }

    @Override
    public List<ProgramCongestionRow> findLatestProgramCongestions(Long eventId) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                with ranked as (
                  select
                    c.program_id,
                    c.congestion_level,
                    c.measured_at,
                    row_number() over (
                      partition by c.program_id
                      order by c.measured_at desc
                    ) as rn
                  from congestions c
                  join event_program p on p.program_id = c.program_id
                  where p.event_id = :eventId
                )
                select
                  r.program_id,
                  r.congestion_level,
                  r.measured_at
                from ranked r
                where r.rn = 1
                """)
                .setParameter("eventId", eventId)
                .getResultList();

        return rows.stream()
                .map(row -> new ProgramCongestionRow(
                        toLongObj(row[0]),
                        toIntObj(row[1]),
                        toDateTime(row[2])
                ))
                .toList();
    }

    @Override
    public List<BoothCongestionRow> findLatestBoothCongestions(Long eventId) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                with ranked as (
                  select
                    p.booth_id,
                    p.program_id,
                    c.congestion_level,
                    c.measured_at,
                    row_number() over (
                      partition by p.booth_id
                      order by c.measured_at desc
                    ) as rn
                  from event_program p
                  left join congestions c on c.program_id = p.program_id
                  where p.event_id = :eventId
                    and p.booth_id is not null
                )
                select
                  r.booth_id,
                  r.program_id,
                  r.congestion_level,
                  r.measured_at
                from ranked r
                where r.rn = 1
                """)
                .setParameter("eventId", eventId)
                .getResultList();

        return rows.stream()
                .map(row -> new BoothCongestionRow(
                        toLongObj(row[0]),
                        toLongObj(row[1]),
                        toIntObj(row[2]),
                        toDateTime(row[3])
                ))
                .toList();
    }

    @Override
    public List<HourlyCongestionRow> findHourlyCongestions(Long eventId) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                select
                  hour(c.measured_at) as h,
                  avg(c.congestion_level) as avg_level
                from congestions c
                join event_program p on p.program_id = c.program_id
                where p.event_id = :eventId
                  and c.measured_at <= now()
                group by hour(c.measured_at)
                order by h asc
                """)
                .setParameter("eventId", eventId)
                .getResultList();

        return rows.stream()
                .map(row -> new HourlyCongestionRow(
                        toIntObj(row[0]),
                        toDoubleObj(row[1])
                ))
                .toList();
    }

    @Override
    public List<ProgramVoteCountRow> findProgramVoteCounts(Long eventId) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                select
                  v.program_id,
                  count(*) as vote_count
                from contest_votes v
                join event_program p on p.program_id = v.program_id
                where p.event_id = :eventId
                  and v.status = 'ACTIVE'
                group by v.program_id
                """)
                .setParameter("eventId", eventId)
                .getResultList();

        return rows.stream()
                .map(row -> new ProgramVoteCountRow(
                        toLongObj(row[0]),
                        toLong(row[1])
                ))
                .toList();
    }

    @Override
    public List<ProgramApplyVoteCountRow> findProgramApplyVoteCounts(Long eventId) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                select
                  v.program_id,
                  v.program_apply_id,
                  count(*) as vote_count
                from contest_votes v
                join event_program p on p.program_id = v.program_id
                where p.event_id = :eventId
                  and v.status = 'ACTIVE'
                group by v.program_id, v.program_apply_id
                """)
                .setParameter("eventId", eventId)
                .getResultList();

        return rows.stream()
                .map(row -> new ProgramApplyVoteCountRow(
                        toLongObj(row[0]),
                        toLongObj(row[1]),
                        toLong(row[2])
                ))
                .toList();
    }

    @Override
    public LocalDateTime findLatestVoteAt(Long eventId) {
        Object value = em.createNativeQuery("""
                select max(v.voted_at)
                from contest_votes v
                join event_program p on p.program_id = v.program_id
                where p.event_id = :eventId
                  and v.status = 'ACTIVE'
                """)
                .setParameter("eventId", eventId)
                .getSingleResult();
        return toDateTime(value);
    }

    private static Long toLongObj(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private static long toLong(Object value) {
        if (value == null) return 0L;
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException ignored) {
            return 0L;
        }
    }

    private static Integer toIntObj(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private static Double toDoubleObj(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private static LocalDateTime toDateTime(Object value) {
        if (value == null) return null;
        if (value instanceof LocalDateTime localDateTime) {
            return localDateTime;
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime();
        }
        return null;
    }

    private static String toStringOrNull(Object value) {
        if (value == null) return null;
        String text = String.valueOf(value);
        return text.isBlank() ? null : text;
    }
}
