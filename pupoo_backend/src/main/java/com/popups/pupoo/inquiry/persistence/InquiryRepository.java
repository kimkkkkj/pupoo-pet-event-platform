// file: src/main/java/com/popups/pupoo/inquiry/persistence/InquiryRepository.java
package com.popups.pupoo.inquiry.persistence;

import com.popups.pupoo.inquiry.domain.enums.InquiryStatus;
import com.popups.pupoo.inquiry.domain.model.Inquiry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface InquiryRepository extends JpaRepository<Inquiry, Long> {

    Page<Inquiry> findByUserId(Long userId, Pageable pageable);

    Page<Inquiry> findByUserIdAndStatus(Long userId, InquiryStatus status, Pageable pageable);

    Optional<Inquiry> findByInquiryIdAndUserId(Long inquiryId, Long userId);

    @Query("""
        select i
        from Inquiry i
        where (:status is null or i.status = :status)
          and (
                :keyword is null
             or :keyword = ''
             or i.inquiryTitle like concat('%', :keyword, '%')
             or i.content like concat('%', :keyword, '%')
          )
        """)
    Page<Inquiry> search(@Param("status") InquiryStatus status,
                         @Param("keyword") String keyword,
                         Pageable pageable);
}
