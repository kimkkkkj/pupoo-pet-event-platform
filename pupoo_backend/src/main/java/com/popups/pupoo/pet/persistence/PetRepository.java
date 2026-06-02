// file: src/main/java/com/popups/pupoo/pet/persistence/PetRepository.java
package com.popups.pupoo.pet.persistence;

import com.popups.pupoo.pet.domain.model.Pet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * Pet Repository
 * - ServiceImpl에서 사용하는 메서드 시그니처와 100% 정합
 */
public interface PetRepository extends JpaRepository<Pet, Long> {

    /**
     * 내 펫 목록 조회 (최신 pet_id 기준 내림차순)
     */
    List<Pet> findAllByUserIdOrderByPetIdDesc(Long userId);

    /**
     * 내 소유 펫 단건 조회 (owner 검증)
     * - 없으면 Optional.empty()
     */
    Optional<Pet> findByPetIdAndUserId(Long petId, Long userId);

    List<Pet> findAllByPetIdIn(List<Long> petIds);

    List<Pet> findAllByUserIdInOrderByPetIdDesc(List<Long> userIds);
}
