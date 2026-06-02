// file: src/main/java/com/popups/pupoo/report/api/ReportReasonController.java
package com.popups.pupoo.report.api;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.report.domain.enums.ReportReasonCode;
import com.popups.pupoo.report.dto.ReportReasonItem;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

/**
 * 신고 사유 코드 제공 API.
 * 목적: 프론트 드롭다운을 표준화한다.
 */
@RestController
@RequestMapping("/api/report-reasons")
public class ReportReasonController {

    @GetMapping
    public ApiResponse<List<ReportReasonItem>> list() {
        List<ReportReasonItem> items = Arrays.stream(ReportReasonCode.values())
                .map(ReportReasonItem::from)
                .toList();
        return ApiResponse.success(items);
    }
}
