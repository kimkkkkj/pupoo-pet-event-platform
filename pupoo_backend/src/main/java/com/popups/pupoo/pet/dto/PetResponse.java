// file: src/main/java/com/popups/pupoo/pet/dto/PetResponse.java
package com.popups.pupoo.pet.dto;

import com.popups.pupoo.pet.domain.enums.AnimalType;
import com.popups.pupoo.pet.domain.enums.PetWeight;
import com.popups.pupoo.pet.domain.model.Pet;

/**
 * 반려동물 응답 DTO
 * - Entity -> DTO 변환 전용
 */
public record PetResponse(
        Long petId,
        String petName,
        AnimalType petBreed,
        Integer petAge,
        PetWeight petWeight,
        String imageUrl
) {

    /**
     * Entity -> Response 변환
     * - imageUrl은 호출 측에서 StorageUrlResolver로 공개 URL로 변환해 넘긴다.
     */
    public static PetResponse from(Pet pet, String imageUrl) {
        return new PetResponse(
                pet.getPetId(),
                pet.getPetName(),
                pet.getPetBreed(),
                pet.getPetAge(),
                pet.getPetWeight(),
                imageUrl
        );
    }
}
