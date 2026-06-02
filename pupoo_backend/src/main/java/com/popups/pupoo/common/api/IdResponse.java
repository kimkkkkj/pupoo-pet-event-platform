// file: src/main/java/com/popups/pupoo/common/api/IdResponse.java
package com.popups.pupoo.common.api;

/**
 * 공통 ID 응답 DTO.
 * - success(null) 금지 정책을 위해 생성/삭제/토글 계열 API에서 최소 응답으로 사용한다.
 */
public record IdResponse(Long id) {
}
