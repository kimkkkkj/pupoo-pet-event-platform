// file: src/main/java/com/popups/pupoo/board/review/domain/enums/ReviewStatus.java
package com.popups.pupoo.board.review.domain.enums;

/**
 * 리뷰 노출 상태다.
 * 신고 접수 상태와 관리자 블라인드 상태를 분리해 저장하며,
 * soft delete는 `DELETED`와 `is_deleted=true`를 함께 사용한다.
 */
public enum ReviewStatus {
    PUBLIC,
    REPORTED,
    BLINDED,
    DELETED
}
