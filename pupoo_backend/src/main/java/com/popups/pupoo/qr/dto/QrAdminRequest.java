// file: src/main/java/com/popups/pupoo/qr/dto/QrAdminRequest.java
package com.popups.pupoo.qr.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * QR 운영(관리자) 요청 DTO
 *
 * - qrId: 필수
 * - programApplyId: (선택) 체험/세션 등 "티켓(=event_program_apply)" 참여 확정 처리에 사용
 *   - 운영 QR 스캔 시, 어떤 티켓을 확정할지 명확히 넘겨주는 방식
 */
@Getter
@NoArgsConstructor
public class QrAdminRequest {

    private Long qrId;

    /**
     * (선택) 프로그램 신청(티켓) ID
     * - null이면 단순 부스 체크인/체크아웃 로그만 남긴다.
     */
    private Long programApplyId;
}
