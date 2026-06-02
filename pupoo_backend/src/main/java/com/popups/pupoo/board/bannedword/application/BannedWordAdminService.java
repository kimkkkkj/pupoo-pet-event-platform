package com.popups.pupoo.board.bannedword.application;

import com.popups.pupoo.board.bannedword.domain.model.BannedWord;
import com.popups.pupoo.board.bannedword.dto.BannedWordCreateRequest;
import com.popups.pupoo.board.bannedword.dto.BannedWordResponse;
import com.popups.pupoo.board.bannedword.dto.BannedWordUpdateRequest;
import com.popups.pupoo.board.bannedword.persistence.BannedWordRepository;
import com.popups.pupoo.board.boardinfo.domain.model.Board;
import com.popups.pupoo.board.boardinfo.persistence.BoardRepository;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BannedWordAdminService {

    private final BannedWordRepository bannedWordRepository;
    private final BoardRepository boardRepository;

    @Transactional(readOnly = true)
    public Page<BannedWordResponse> list(Long boardId, String keyword, Pageable pageable) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "게시판을 찾을 수 없습니다."));
        String q = keyword != null ? keyword.trim() : "";
        Page<BannedWord> page = q.isEmpty()
                ? bannedWordRepository.findByBoardIdOrGlobal(board.getBoardId(), pageable)
                : bannedWordRepository.findByBoardIdOrGlobalAndBannedWordContainingIgnoreCase(
                        board.getBoardId(), q, pageable);
        return page.map(BannedWordResponse::from);
    }

    @Transactional
    public Long create(Long boardId, BannedWordCreateRequest request) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "게시판을 찾을 수 없습니다."));

        boolean duplicate = bannedWordRepository.findAllByBoard_BoardIdOrderByBannedWordIdAsc(boardId).stream()
                .anyMatch(b -> b.getBannedWord() != null
                        && b.getBannedWord().trim().equalsIgnoreCase(request.getBannedWord().trim()));
        if (duplicate) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "이미 등록된 금지어입니다.");
        }

        BannedWord entity = BannedWord.builder()
                .board(board)
                .bannedWord(request.getBannedWord().trim())
                .category(request.getCategory())
                .replacement(request.getReplacement() != null ? request.getReplacement().trim() : null)
                .build();
        BannedWord saved = bannedWordRepository.save(entity);
        return saved.getBannedWordId();
    }

    @Transactional
    public void update(Long bannedWordId, BannedWordUpdateRequest request) {
        BannedWord entity = bannedWordRepository.findById(bannedWordId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "금지어를 찾을 수 없습니다."));
        entity.update(
                request.getBannedWord(),
                request.getCategory(),
                request.getReplacement() != null ? request.getReplacement().trim() : null
        );
    }

    @Transactional
    public void delete(Long bannedWordId) {
        if (!bannedWordRepository.existsById(bannedWordId)) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "금지어를 찾을 수 없습니다.");
        }
        bannedWordRepository.deleteById(bannedWordId);
    }
}
