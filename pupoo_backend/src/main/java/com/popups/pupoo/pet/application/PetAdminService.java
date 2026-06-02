// file: src/main/java/com/popups/pupoo/pet/application/PetAdminService.java
package com.popups.pupoo.pet.application;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.pet.domain.model.Pet;
import com.popups.pupoo.pet.dto.PetResponse;
import com.popups.pupoo.pet.persistence.PetRepository;
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

    public PetAdminService(PetRepository petRepository) {
        this.petRepository = petRepository;
    }

    /**
     * 전체 반려동물 조회 (관리자)
     */
    @Transactional(readOnly = true)
    public List<PetResponse> findAll() {
        return petRepository.findAll().stream()
                .map(PetResponse::from)
                .toList();
    }

    /**
     * 단건 조회 (관리자)
     */
    @Transactional(readOnly = true)
    public PetResponse findById(Long petId) {
        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PET_NOT_FOUND));

        return PetResponse.from(pet);
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
