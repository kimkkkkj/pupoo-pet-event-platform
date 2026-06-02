// file: src/main/java/com/popups/pupoo/qr/dto/QrCheckinRequest.java
package com.popups.pupoo.qr.dto;

/**
 * QR 체크인 요청 DTO.
 *
 * 현재 관리자 체크인 API는 QrAdminRequest를 사용하지만,
 * 사용자/운영 API 확장 시 사용할 수 있도록 DTO를 유지한다.
 */
public class QrCheckinRequest {

    public Long qrId;
    public Long programApplyId;
}
