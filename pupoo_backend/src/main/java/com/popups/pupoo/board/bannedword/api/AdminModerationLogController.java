package com.popups.pupoo.board.bannedword.api;

import com.popups.pupoo.board.bannedword.application.BoardBannedLogAdminService;
import com.popups.pupoo.board.bannedword.dto.BoardBannedLogResponse;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/moderation")
public class AdminModerationLogController {

    private final BoardBannedLogAdminService boardBannedLogAdminService;

    /**
     * AI 모더레이션 BLOCK 로그 (board_banned_logs) — 최신순
     *
     * @param boardId 선택 시 해당 게시판만, 미지정 시 전체
     */
    @GetMapping("/logs")
    public ApiResponse<PageResponse<BoardBannedLogResponse>> listLogs(
            @RequestParam(required = false) Long boardId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "logId"));
        return ApiResponse.success(PageResponse.from(boardBannedLogAdminService.list(boardId, pageable)));
    }
}
