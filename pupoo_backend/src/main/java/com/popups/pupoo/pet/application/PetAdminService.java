// file: src/main/java/com/popups/pupoo/pet/application/PetAdminService.java
package com.popups.pupoo.pet.application;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.pet.domain.model.Pet;
import com.popups.pupoo.pet.dto.PetResponse;
import com.popups.pupoo.pet.persistence.PetRepository;
import com.popups.pupoo.storage.support.StorageUrlResolver;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 관리자 전용 Pet 관리 서비스
 * - 전체 조회
 * - 단건 조회
 * - 삭제
 */
@Service
@Transactional
public class PetAdminService {

    private final PetRepository petRepository;
    private final StorageUrlResolver storageUrlResolver;

    public PetAdminService(PetRepository petRepository, StorageUrlResolver storageUrlResolver) {
        this.petRepository = petRepository;
        this.storageUrlResolver = storageUrlResolver;
    }

    private PetResponse toResponse(Pet pet) {
        return PetResponse.from(pet, storageUrlResolver.toPublicUrl(pet.getImageUrl()));
    }

    /**
     * 전체 반려동물 조회 (관리자)
     */
    @Transactional(readOnly = true)
    public List<PetResponse> findAll() {
        return petRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * 단건 조회 (관리자)
     */
    @Transactional(readOnly = true)
    public PetResponse findById(Long petId) {
        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PET_NOT_FOUND));

        return toResponse(pet);
    }

    /**
     * 삭제 (관리자)
     */
    public void delete(Long petId) {
        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PET_NOT_FOUND));

        petRepository.delete(pet);
    }
}
