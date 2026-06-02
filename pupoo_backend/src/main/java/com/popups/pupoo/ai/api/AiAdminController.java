package com.popups.pupoo.ai.api;

import com.popups.pupoo.ai.application.AiCongestionAggregationService;
import com.popups.pupoo.ai.application.AiCongestionService;
import com.popups.pupoo.ai.dto.AiCongestionBackfillRequest;
import com.popups.pupoo.ai.dto.AiCongestionBackfillResponse;
import com.popups.pupoo.ai.dto.AiCongestionPredictionResponse;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/admin/ai")
public class AiAdminController {

    private final AiCongestionService aiCongestionService;
    private final AiCongestionAggregationService aiCongestionAggregationService;

    public AiAdminController(
            AiCongestionService aiCongestionService,
            AiCongestionAggregationService aiCongestionAggregationService
    ) {
        this.aiCongestionService = aiCongestionService;
        this.aiCongestionAggregationService = aiCongestionAggregationService;
    }

    @GetMapping("/events/{eventId}/congestion/predict")
    public ApiResponse<AiCongestionPredictionResponse> predictEventCongestion(
            @PathVariable Long eventId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to
    ) {
        return ApiResponse.success(aiCongestionService.predictEvent(eventId, from, to));
    }

    @GetMapping("/events/{eventId}/programs/congestion")
    public ApiResponse<List<AiCongestionPredictionResponse>> predictProgramsCongestion(@PathVariable Long eventId) {
        return ApiResponse.success(aiCongestionService.predictProgramsByEvent(eventId));
    }

    @PostMapping("/congestion/backfill")
    public ApiResponse<AiCongestionBackfillResponse> backfillCongestion(
            @RequestBody AiCongestionBackfillRequest request
    ) {
        if (request == null) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST);
        }
        return ApiResponse.success(
                aiCongestionAggregationService.backfillAllRange(request.from(), request.to())
        );
    }
}
