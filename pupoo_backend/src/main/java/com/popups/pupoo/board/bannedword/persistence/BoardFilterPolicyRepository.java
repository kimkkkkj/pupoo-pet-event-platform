package com.popups.pupoo.board.bannedword.persistence;

import com.popups.pupoo.board.bannedword.domain.enums.BannedWordCategory;
import com.popups.pupoo.board.bannedword.domain.model.BoardFilterPolicy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BoardFilterPolicyRepository extends JpaRepository<BoardFilterPolicy, Long> {

    List<BoardFilterPolicy> findAllByBoard_BoardIdOrderByCategory(Long boardId);

    Optional<BoardFilterPolicy> findByBoard_BoardIdAndCategory(Long boardId, BannedWordCategory category);
}
