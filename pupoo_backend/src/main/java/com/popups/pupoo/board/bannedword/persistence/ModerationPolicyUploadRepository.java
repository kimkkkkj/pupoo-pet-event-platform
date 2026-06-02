package com.popups.pupoo.board.bannedword.persistence;

import com.popups.pupoo.board.bannedword.domain.model.ModerationPolicyUpload;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ModerationPolicyUploadRepository extends JpaRepository<ModerationPolicyUpload, Long> {

    Page<ModerationPolicyUpload> findAllByOrderByPolicyUploadIdDesc(Pageable pageable);
}
