// file: src/main/java/com/popups/pupoo/report/persistence/ContentReportRepository.java
package com.popups.pupoo.report.persistence;

import com.popups.pupoo.report.domain.enums.ReportStatus;
import com.popups.pupoo.report.domain.enums.ReportTargetType;
import com.popups.pupoo.report.domain.model.ContentReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.List;

public interface ContentReportRepository extends JpaRepository<ContentReport, Long> {

    /**
     * targetId별 신고 카운트(총합/미처리)를 조회하기 위한 projection.
     */
    interface TargetCountRow {
        Long getTargetId();
        long getTotalCount();
        long getPendingCount();
    }

    Optional<ContentReport> findByReporterUserIdAndTargetTypeAndTargetId(Long reporterUserId, ReportTargetType targetType, Long targetId);

    boolean existsByReporterUserIdAndTargetTypeAndTargetId(Long reporterUserId, ReportTargetType targetType, Long targetId);

    @Query("""
        select r
          from ContentReport r
         where (:status is null or r.status = :status)
           and (:targetType is null or r.targetType = :targetType)
           and (:reporterUserId is null or r.reporterUserId = :reporterUserId)
    """)
    Page<ContentReport> search(@Param("status") ReportStatus status,
                              @Param("targetType") ReportTargetType targetType,
                              @Param("reporterUserId") Long reporterUserId,
                              Pageable pageable);

    @Query(
        value = """
            select r
              from ContentReport r
             where (:status is null or r.status = :status)
               and (:targetType is null or r.targetType = :targetType)
               and (:reporterUserId is null or r.reporterUserId = :reporterUserId)
             order by (
                 select count(r2)
                   from ContentReport r2
                  where r2.targetType = r.targetType
                    and r2.targetId = r.targetId
             ) desc,
             r.createdAt desc,
             r.reportId desc
        """,
        countQuery = """
            select count(r)
              from ContentReport r
             where (:status is null or r.status = :status)
               and (:targetType is null or r.targetType = :targetType)
               and (:reporterUserId is null or r.reporterUserId = :reporterUserId)
        """
    )
    Page<ContentReport> searchOrderByTotalReportCount(@Param("status") ReportStatus status,
                                                      @Param("targetType") ReportTargetType targetType,
                                                      @Param("reporterUserId") Long reporterUserId,
                                                      Pageable pageable);

    @Query("""
        select count(r)
          from ContentReport r
         where r.targetType = :targetType
           and r.targetId = :targetId
           and r.status = :status
    """)
    long countByTargetAndStatus(@Param("targetType") ReportTargetType targetType,
                               @Param("targetId") Long targetId,
                               @Param("status") ReportStatus status);

    @Query("""
        select r.targetId as targetId,
               count(r) as totalCount,
               sum(case when r.status = com.popups.pupoo.report.domain.enums.ReportStatus.PENDING then 1 else 0 end) as pendingCount
          from ContentReport r
         where r.targetType = :targetType
           and r.targetId in :targetIds
         group by r.targetId
    """)
    List<TargetCountRow> countGroupedByTargetId(@Param("targetType") ReportTargetType targetType,
                                               @Param("targetIds") List<Long> targetIds);

    @Query("""
        select distinct r.targetId
          from ContentReport r
         where r.targetType = :targetType
           and r.status = :status
    """)
    List<Long> findDistinctTargetIds(@Param("targetType") ReportTargetType targetType,
                                    @Param("status") ReportStatus status);
}
