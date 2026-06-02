// file: src/main/java/com/popups/pupoo/qr/api/QrController.java
package com.popups.pupoo.qr.api;

import com.popups.pupoo.auth.security.util.SecurityUtil;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.qr.application.QrService;
import com.popups.pupoo.qr.dto.QrHistoryResponse;
import com.popups.pupoo.qr.dto.QrIssueResponse;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
/**
 * 기능: 사용자 QR 발급, 다운로드, 방문 이력 조회 API를 제공한다.
 * 설명: 현재 로그인 사용자를 기준으로 QR 관련 기능을 노출하고, 프론트의 체크인 화면과 연결된다.
 * 흐름: 사용자 식별 -> QrService 위임 -> API 응답 또는 파일 응답 반환 순서로 처리한다.
 */
// 기능: 사용자 QR 발급, 다운로드, 방문 이력 조회 API를 제공한다.
// 설명: 현재 로그인 사용자를 기준으로 QR 관련 기능을 노출하고, 체크인 화면과 직접 연결된다.
// 흐름: 사용자 식별 -> QrService 위임 -> API 응답 또는 파일 응답 반환.
public class QrController {

    private final QrService qrService;
    private final SecurityUtil securityUtil;

    public QrController(QrService qrService,
                        SecurityUtil securityUtil) {
        this.qrService = qrService;
        this.securityUtil = securityUtil;
    }

    /**
     * 내 QR 조회(없으면 발급) - event_id 기준
     * GET /api/qr/me?eventId=6
     */
    /**
     * 기능: 사용자별 QR 코드를 조회하거나 없으면 발급한다.
     * 설명: 이벤트 ID 기준으로 유효한 QR이 있으면 재사용하고, 없으면 새로 발급한다.
     * 흐름: 현재 사용자 조회 -> 서비스 호출 -> QrIssueResponse 반환.
     */
    @GetMapping("/qr/me")
    // 기능: 사용자별 QR 코드를 조회하거나 없으면 발급한다.
    // 설명: 이벤트 ID 기준으로 유효한 QR이 있으면 재사용하고, 없으면 새로 발급한다.
    // 흐름: 현재 사용자 조회 -> qrService.getMyQrOrIssue 호출 -> ApiResponse 반환.
    public ApiResponse<QrIssueResponse> getMyQr(@RequestParam(name = "eventId") Long eventId) {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(qrService.getMyQrOrIssue(userId, eventId));
    }

    /**
     * 기능: 사용자 QR 이미지를 다운로드한다.
     * 설명: QR 원본 URL을 PNG로 변환한 뒤 파일 응답으로 내려준다.
     * 흐름: 현재 사용자 조회 -> 서비스에서 이미지 생성 -> 다운로드 헤더 구성 -> 바디 반환.
     */
    @GetMapping("/qr/me/download")
    // 기능: 사용자 QR 이미지를 다운로드한다.
    // 설명: QR 원본 URL을 PNG로 생성해 attachment 응답으로 반환한다.
    // 흐름: 현재 사용자 조회 -> qrService.downloadMyQr 호출 -> 파일 응답 반환.
    public ResponseEntity<byte[]> downloadMyQr(@RequestParam(name = "eventId") Long eventId) {
        Long userId = securityUtil.currentUserId();
        QrService.QrDownloadResult result = qrService.downloadMyQr(userId, eventId);

        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(result.contentType());
        } catch (IllegalArgumentException e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .contentLength(result.bytes().length)
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(result.filename(), StandardCharsets.UTF_8)
                                .build()
                                .toString()
                )
                .body(result.bytes());
    }

    /**
     * 내 QR 문자 발송 테스트(로컬 시뮬레이션)
     * POST /api/qr/me/sms-test
     */
    /**
     * 기능: QR 문자 발송 시뮬레이션 응답을 제공한다.
     * 설명: 실제 문자 발송 대신 현재 발급 가능한 QR 정보를 묶어서 테스트 응답만 반환한다.
     * 흐름: 현재 사용자 조회 -> QR 확보 -> 시뮬레이션 결과 생성 -> ApiResponse 반환.
     */
    @PostMapping("/qr/me/sms-test")
    // 기능: QR 문자 발송 시뮬레이션 응답을 제공한다.
    // 설명: 실제 문자 전송 없이 발급 가능한 QR 정보와 요청 내용을 묶어 반환한다.
    // 흐름: 현재 사용자 조회 -> QR 확보 -> 시뮬레이션 결과 구성 -> ApiResponse 반환.
    public ApiResponse<Map<String, Object>> sendMyQrSmsTest(
            @RequestBody QrSmsTestRequest request
    ) {
        Long userId = securityUtil.currentUserId();
        QrIssueResponse qr = qrService.getMyQrOrIssue(userId, request.getEventId());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "SIMULATED");
        result.put("eventId", request.getEventId());
        result.put("qrId", qr.getQrId());
        result.put("phone", request.getPhone());
        result.put("message", request.getMessage());
        result.put("requestedAt", LocalDateTime.now());
        return ApiResponse.success(result);
    }

    /**
     *  내 부스 방문 목록 (이벤트별 그룹)
     * GET /api/me/booth-visits
     */
    /**
     * 기능: 사용자의 부스 방문 이력을 이벤트별로 묶어 조회한다.
     * 설명: 전체 이벤트 기준 방문 요약 목록을 반환한다.
     * 흐름: 현재 사용자 조회 -> 서비스 집계 조회 -> grouped 응답 반환.
     */
    @GetMapping("/me/booth-visits")
    public ApiResponse<List<QrHistoryResponse.EventBoothVisits>> getMyBoothVisitsGroupedByEvent() {
        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(qrService.getMyBoothVisitsGroupedByEvent(userId));
    }

    /**
     *  내 부스 방문 목록 (특정 이벤트 1개) - eventName 포함
     * GET /api/events/{eventId}/me/booth-visits
     *
     * 응답: { eventId, eventName, booths:[...] }
     * - booths[] 항목에는 company/description 포함
     */
    /**
     * 기능: 특정 이벤트에 대한 사용자 부스 방문 이력을 조회한다.
     * 설명: 이벤트 하나만 대상으로 방문 요약을 반환한다.
     * 흐름: 현재 사용자 조회 -> 이벤트별 서비스 조회 -> 단일 이벤트 응답 반환.
     */
    @GetMapping("/events/{eventId}/me/booth-visits")
    public ApiResponse<QrHistoryResponse.EventBoothVisits> getMyBoothVisits(
            @PathVariable(name = "eventId") Long eventId) {

        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(qrService.getMyBoothVisitsEvent(userId, eventId));
    }

    /**
     * 내 부스 방문 로그(여러번 기록)
     * GET /api/events/{eventId}/booths/{boothId}/me/visits
     */
    /**
     * 기능: 특정 부스에 대한 사용자 방문 로그를 조회한다.
     * 설명: 체크인 로그를 시간순 방문 이력으로 반환한다.
     * 흐름: 현재 사용자 조회 -> 서비스 검증 및 조회 -> 방문 로그 목록 반환.
     */
    @GetMapping("/events/{eventId}/booths/{boothId}/me/visits")
    public ApiResponse<List<QrHistoryResponse.VisitLog>> getMyBoothVisitLogs(
            @PathVariable(name = "eventId") Long eventId,
            @PathVariable(name = "boothId") Long boothId) {

        Long userId = securityUtil.currentUserId();
        return ApiResponse.success(qrService.getMyBoothVisitLogs(userId, eventId, boothId));
    }

    public static class QrSmsTestRequest {
        private Long eventId;
        private String phone;
        private String message;

        public Long getEventId() {
            return eventId;
        }

        public void setEventId(Long eventId) {
            this.eventId = eventId;
        }

        public String getPhone() {
            return phone;
        }

        public void setPhone(String phone) {
            this.phone = phone;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }
    }
}
