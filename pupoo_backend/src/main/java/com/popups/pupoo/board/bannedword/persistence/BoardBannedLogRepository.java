package com.popups.pupoo.board.bannedword.persistence;

import com.popups.pupoo.board.bannedword.domain.model.BoardBannedLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BoardBannedLogRepository extends JpaRepository<BoardBannedLog, Long> {

    Page<BoardBannedLog> findAllByOrderByLogIdDesc(Pageable pageable);

    Page<BoardBannedLog> findAllByBoardIdOrderByLogIdDesc(Long boardId, Pageable pageable);
}
