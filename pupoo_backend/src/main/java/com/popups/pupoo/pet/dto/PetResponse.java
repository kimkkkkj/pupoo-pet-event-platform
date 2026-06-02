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
        PetWeight petWeight
) {

    /**
     * Entity -> Response 변환
     */
    public static PetResponse from(Pet pet) {
        return new PetResponse(
                pet.getPetId(),
                pet.getPetName(),
                pet.getPetBreed(),
                pet.getPetAge(),
                pet.getPetWeight()
        );
    }
}
