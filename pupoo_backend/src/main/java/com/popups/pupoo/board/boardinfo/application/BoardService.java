// file: src/main/java/com/popups/pupoo/board/boardinfo/application/BoardService.java
package com.popups.pupoo.board.boardinfo.application;

import com.popups.pupoo.common.audit.application.AdminLogService;
import com.popups.pupoo.common.audit.domain.enums.AdminTargetType;
import com.popups.pupoo.board.boardinfo.domain.model.Board;
import com.popups.pupoo.board.boardinfo.dto.BoardCreateRequest;
import com.popups.pupoo.board.boardinfo.dto.BoardResponse;
import com.popups.pupoo.board.boardinfo.dto.BoardUpdateRequest;
import com.popups.pupoo.board.boardinfo.persistence.BoardRepository;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BoardService {

    private final BoardRepository boardRepository;
    private final AdminLogService adminLogService;

    public List<BoardResponse> getBoards(boolean activeOnly) {
        List<Board> boards = activeOnly
                ? boardRepository.findAllByActiveTrueOrderByBoardIdAsc()
                : boardRepository.findAllByOrderByBoardIdAsc();

        return boards.stream().map(BoardResponse::from).toList();
    }

    @Transactional
    public Long createBoard(BoardCreateRequest req) {
        if (req.getBoardType() == null || req.getBoardName() == null || req.getBoardName().isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "boardType/boardName은 필수입니다.");
        }
        if (boardRepository.existsByBoardType(req.getBoardType())) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "이미 존재하는 boardType 입니다.");
        }

        boolean active = (req.getActive() == null) ? true : req.getActive();

        Board board = Board.builder()
                .boardName(req.getBoardName())
                .boardType(req.getBoardType())
                .active(active)
                .build();

        Long boardId = boardRepository.save(board).getBoardId();
        adminLogService.write("BOARD_CREATE", AdminTargetType.OTHER, boardId);
        return boardId;
    }

    public BoardResponse getBoard(Long boardId) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "게시판이 존재하지 않습니다."));
        return BoardResponse.from(board);
    }

    @Transactional
    public void updateBoard(Long boardId, BoardUpdateRequest req) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "게시판이 존재하지 않습니다."));

        if (req.getBoardName() != null && !req.getBoardName().isBlank()) {
            board.updateBoardName(req.getBoardName());
        }
        if (req.getActive() != null) {
            board.changeActive(req.getActive());
        }

        adminLogService.write("BOARD_UPDATE", AdminTargetType.OTHER, boardId);
    }

    @Transactional
    public void changeActive(Long boardId, boolean active) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "게시판이 존재하지 않습니다."));
        board.changeActive(active);

        adminLogService.write("BOARD_CHANGE_ACTIVE:" + active, AdminTargetType.OTHER, boardId);
    }
}
