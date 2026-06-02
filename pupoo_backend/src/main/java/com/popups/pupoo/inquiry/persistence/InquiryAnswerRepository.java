// file: src/main/java/com/popups/pupoo/inquiry/persistence/InquiryAnswerRepository.java
package com.popups.pupoo.inquiry.persistence;

import com.popups.pupoo.inquiry.domain.model.InquiryAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InquiryAnswerRepository extends JpaRepository<InquiryAnswer, Long> {
    List<InquiryAnswer> findAllByInquiryInquiryIdOrderByCreatedAtAsc(Long inquiryId);
}
