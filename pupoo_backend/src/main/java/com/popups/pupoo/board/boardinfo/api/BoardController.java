// file: src/main/java/com/popups/pupoo/board/boardinfo/api/BoardController.java
package com.popups.pupoo.board.boardinfo.api;

import com.popups.pupoo.board.boardinfo.application.BoardService;
import com.popups.pupoo.board.boardinfo.dto.BoardCreateRequest;
import com.popups.pupoo.board.boardinfo.dto.BoardResponse;
import com.popups.pupoo.board.boardinfo.dto.BoardUpdateRequest;
import com.popups.pupoo.common.api.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class BoardController {

    private final BoardService boardService;

    @GetMapping("/api/boards")
    public ApiResponse<List<BoardResponse>> getBoards(@RequestParam(defaultValue = "true") boolean activeOnly) {
        return ApiResponse.success(boardService.getBoards(activeOnly));
    }

    @PostMapping("/api/admin/boards")
    public ApiResponse<Long> createBoard(@RequestBody BoardCreateRequest req) {
        return ApiResponse.success(boardService.createBoard(req));
    }

    @GetMapping("/api/admin/boards/{boardId}")
    public ApiResponse<BoardResponse> getBoard(@PathVariable Long boardId) {
        return ApiResponse.success(boardService.getBoard(boardId));
    }

    @PutMapping("/api/admin/boards/{boardId}")
    public ApiResponse<BoardResponse> updateBoard(@PathVariable Long boardId, @RequestBody BoardUpdateRequest req) {
        boardService.updateBoard(boardId, req);
        return ApiResponse.success(boardService.getBoard(boardId));
    }

    @PatchMapping("/api/admin/boards/{boardId}/active")
    public ApiResponse<BoardResponse> changeActive(@PathVariable Long boardId, @RequestParam boolean active) {
        boardService.changeActive(boardId, active);
        return ApiResponse.success(boardService.getBoard(boardId));
    }
}
