// file: src/main/java/com/popups/pupoo/adminlog/persistence/AdminLogRepository.java
package com.popups.pupoo.common.audit.persistence;

import com.popups.pupoo.common.audit.domain.enums.AdminTargetType;
import com.popups.pupoo.common.audit.domain.model.AdminLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AdminLogRepository extends JpaRepository<AdminLog, Long> {

    @Query("""
            select l
              from AdminLog l
             where (:targetType is null or l.targetType = :targetType)
               and (
                    :keyword is null
                    or lower(l.action) like lower(concat('%', :keyword, '%'))
                    or str(l.adminId) like concat('%', :keyword, '%')
                    or (l.targetId is not null and str(l.targetId) like concat('%', :keyword, '%'))
               )
            """)
    Page<AdminLog> search(@Param("keyword") String keyword,
                          @Param("targetType") AdminTargetType targetType,
                          Pageable pageable);
}
