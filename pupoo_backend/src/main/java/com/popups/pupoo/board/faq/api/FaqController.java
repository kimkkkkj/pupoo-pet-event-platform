// file: src/main/java/com/popups/pupoo/board/faq/api/FaqController.java
package com.popups.pupoo.board.faq.api;

import com.popups.pupoo.board.faq.application.FaqQueryService;
import com.popups.pupoo.board.faq.dto.FaqDetailResponse;
import com.popups.pupoo.board.faq.dto.FaqListResponse;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.search.SearchType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/faqs")
public class FaqController {

    private final FaqQueryService faqQueryService;

    @GetMapping
    public ApiResponse<Page<FaqListResponse>> list(
            @RequestParam(required = false) String searchType,
            @RequestParam(required = false) String keyword,
            Pageable pageable
    ) {
        return ApiResponse.success(faqQueryService.list(SearchType.from(searchType), keyword, pageable));
    }

    @GetMapping("/{postId}")
    public ApiResponse<FaqDetailResponse> get(@PathVariable Long postId) {
        return ApiResponse.success(faqQueryService.get(postId));
    }
}
