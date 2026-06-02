package com.popups.pupoo.common.audit.domain.enums;

/**
 * 관리자 작업 로그 대상 유형이다.
 * DB admin_logs.target_type ENUM과 정합성을 유지한다.
 */
public enum AdminTargetType {
    USER,
    EVENT,
    PROGRAM,
    BOOTH,
    NOTICE,
    PAYMENT,
    REFUND,
    REVIEW,
    POST,
    QNA,
    INQUIRY,
    GALLERY,
    QR,
    SYSTEM,
    OTHER
}
