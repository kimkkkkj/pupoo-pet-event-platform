// file: src/main/java/com/popups/pupoo/pet/dto/PetMeResponse.java
// com.popups.pupoo.pet.dto.PetMeResponse.java
package com.popups.pupoo.pet.dto;

import java.util.List;

/**
 * GET /api/pets/me 응답 DTO
 * - 펫이 없으면 빈 리스트 반환
 */
public record PetMeResponse(
        List<PetResponse> pets
) {}
