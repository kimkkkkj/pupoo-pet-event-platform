// file: src/main/java/com/popups/pupoo/pet/application/PetServiceImpl.java
package com.popups.pupoo.pet.application;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.pet.domain.model.Pet;
import com.popups.pupoo.pet.dto.PetCreateRequest;
import com.popups.pupoo.pet.dto.PetMeResponse;
import com.popups.pupoo.pet.dto.PetResponse;
import com.popups.pupoo.pet.dto.PetUpdateRequest;
import com.popups.pupoo.pet.persistence.PetRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class PetServiceImpl implements PetService {

    private final PetRepository petRepository;

    public PetServiceImpl(PetRepository petRepository) {
        this.petRepository = petRepository;
    }

    @Override
    public Long create(Long userId, PetCreateRequest request) {
        Pet pet = new Pet(
                userId,
                request.petName(),
                request.petBreed(),
                request.petAge(),
                request.petWeight()
        );
        return petRepository.save(pet).getPetId();
    }

    @Override
    public void update(Long userId, Long petId, PetUpdateRequest request) {
        Pet pet = petRepository.findByPetIdAndUserId(petId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PET_NOT_FOUND));

        pet.update(
                request.petName(),
                request.petBreed(),
                request.petAge()
        );
    }

    @Override
    public void delete(Long userId, Long petId) {
        Pet pet = petRepository.findByPetIdAndUserId(petId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PET_NOT_FOUND));

        petRepository.delete(pet);
    }

    @Override
    @Transactional(readOnly = true)
    public PetMeResponse getMe(Long userId) {
        List<PetResponse> pets = petRepository.findAllByUserIdOrderByPetIdDesc(userId).stream()
                .map(PetResponse::from)
                .toList();

        return new PetMeResponse(pets);
    }
}
