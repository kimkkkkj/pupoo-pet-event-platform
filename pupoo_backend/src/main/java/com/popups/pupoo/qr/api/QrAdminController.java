// file: src/main/java/com/popups/pupoo/qr/api/QrAdminController.java
package com.popups.pupoo.qr.api;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.qr.application.QrAdminService;
import com.popups.pupoo.qr.dto.QrAdminRequest;
import com.popups.pupoo.qr.dto.QrCheckinResponse;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/operations")
public class QrAdminController {

    private final QrAdminService qrAdminService;

    public QrAdminController(QrAdminService qrAdminService) {
        this.qrAdminService = qrAdminService;
    }

    @PostMapping("/events/{eventId}/booths/{boothId}/qr/check-in")
    public ApiResponse<QrCheckinResponse> checkIn(
            @PathVariable(name = "eventId") Long eventId,
            @PathVariable(name = "boothId") Long boothId,
            @RequestBody QrAdminRequest request
    ) {
        return ApiResponse.success(qrAdminService.checkIn(eventId, boothId, request.getQrId(), request.getProgramApplyId()));
    }

    @PostMapping("/events/{eventId}/booths/{boothId}/qr/check-out")
    public ApiResponse<QrCheckinResponse> checkOut(
            @PathVariable(name = "eventId") Long eventId,
            @PathVariable(name = "boothId") Long boothId,
            @RequestBody QrAdminRequest request
    ) {
        return ApiResponse.success(qrAdminService.checkOut(eventId, boothId, request.getQrId(), request.getProgramApplyId()));
    }
}
