// file: src/main/java/com/popups/pupoo/pet/dto/PetCreateRequest.java
package com.popups.pupoo.pet.dto;

import com.popups.pupoo.pet.domain.enums.AnimalType;
import com.popups.pupoo.pet.domain.enums.PetWeight;
import jakarta.validation.constraints.*;

public record PetCreateRequest(

        @NotBlank(message = "반려동물 이름은 필수입니다.")
        @Size(max = 100, message = "반려동물 이름은 100자 이하로 입력하세요.")
        String petName,

        @NotNull(message = "반려동물 종류는 필수입니다.")
        AnimalType petBreed,

        @NotNull(message = "반려동물 나이는 필수입니다.")
        @Min(value = 0, message = "나이는 0 이상이어야 합니다.")
        @Max(value = 100, message = "나이는 100 이하로 입력하세요.")
        Integer petAge,

        @NotNull(message = "petWeight is required")
        PetWeight petWeight
) {
}
