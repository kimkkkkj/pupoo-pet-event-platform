package com.popups.pupoo.board.bannedword.api;

import com.popups.pupoo.board.bannedword.application.BannedWordAdminService;
import com.popups.pupoo.board.bannedword.dto.BannedWordCreateRequest;
import com.popups.pupoo.board.bannedword.dto.BannedWordResponse;
import com.popups.pupoo.board.bannedword.dto.BannedWordUpdateRequest;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.IdResponse;
import com.popups.pupoo.common.api.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin")
public class AdminBannedWordController {

    private final BannedWordAdminService bannedWordAdminService;

    @GetMapping("/boards/{boardId}/banned-words")
    public ApiResponse<PageResponse<BannedWordResponse>> list(
            @PathVariable Long boardId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String q) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "bannedWordId"));
        return ApiResponse.success(PageResponse.from(bannedWordAdminService.list(boardId, q, pageable)));
    }

    @PostMapping("/boards/{boardId}/banned-words")
    public ApiResponse<IdResponse> create(
            @PathVariable Long boardId,
            @Valid @RequestBody BannedWordCreateRequest request) {
        Long id = bannedWordAdminService.create(boardId, request);
        return ApiResponse.success(new IdResponse(id));
    }

    @PatchMapping("/banned-words/{bannedWordId}")
    public ApiResponse<IdResponse> update(
            @PathVariable Long bannedWordId,
            @Valid @RequestBody BannedWordUpdateRequest request) {
        bannedWordAdminService.update(bannedWordId, request);
        return ApiResponse.success(new IdResponse(bannedWordId));
    }

    @DeleteMapping("/banned-words/{bannedWordId}")
    public ApiResponse<IdResponse> delete(@PathVariable Long bannedWordId) {
        bannedWordAdminService.delete(bannedWordId);
        return ApiResponse.success(new IdResponse(bannedWordId));
    }
}
