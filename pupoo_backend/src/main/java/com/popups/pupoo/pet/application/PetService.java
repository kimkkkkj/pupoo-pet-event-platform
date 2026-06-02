// file: src/main/java/com/popups/pupoo/pet/application/PetService.java
package com.popups.pupoo.pet.application;

import com.popups.pupoo.pet.dto.PetCreateRequest;
import com.popups.pupoo.pet.dto.PetMeResponse;
import com.popups.pupoo.pet.dto.PetUpdateRequest;

public interface PetService {

    /**
     * 내 반려동물 등록
     */
    Long create(Long userId, PetCreateRequest request);

    /**
     * 내 반려동물 목록 조회
     */
    PetMeResponse getMe(Long userId);

    /**
     * 내 반려동물 수정 (owner 검증 필수)
     */
    void update(Long userId, Long petId, PetUpdateRequest request);

    /**
     * 내 반려동물 삭제 (owner 검증 필수)
     */
    void delete(Long userId, Long petId);
}
