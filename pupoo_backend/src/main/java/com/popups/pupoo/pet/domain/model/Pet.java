// file: src/main/java/com/popups/pupoo/pet/domain/model/Pet.java
package com.popups.pupoo.pet.domain.model;

import com.popups.pupoo.pet.domain.enums.AnimalType;
import com.popups.pupoo.pet.domain.enums.PetWeight;
import jakarta.persistence.*;

/**
 * Pet Entity
 *
 * DB 기준:
 * - pet_id (PK, AI)
 * - user_id (FK)
 * - pet_name (varchar)
 * - pet_breed (ENUM: 'DOG','CAT','OTHER')
 * - pet_age (int)
 * - pet_weight (ENUM: 'XS','S','M','L','XL')
 */
@Entity
@Table(name = "pet")
public class Pet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pet_id")
    private Long petId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "pet_name", length = 100)
    private String petName;

    @Enumerated(EnumType.STRING)
    @Column(name = "pet_breed", columnDefinition = "ENUM('DOG','CAT','OTHER')")
    private AnimalType petBreed;

    @Column(name = "pet_age")
    private Integer petAge;

    @Enumerated(EnumType.STRING)
    @Column(name = "pet_weight", columnDefinition = "ENUM('XS','S','M','L','XL')")
    private PetWeight petWeight;

    protected Pet() {
        // JPA only
    }

    /**
     * ServiceImpl에서 사용 중인 생성자 시그니처 정합:
     * new Pet(userId, petName, petBreed, petAge, petWeight)
     */
    public Pet(Long userId, String petName, AnimalType petBreed, Integer petAge, PetWeight petWeight) {
        this.userId = userId;
        this.petName = petName;
        this.petBreed = petBreed;
        this.petAge = petAge;
        this.petWeight = petWeight;
    }

    /**
     * 수정 메서드 시그니처 정합:
     * pet.update(petName, petBreed, petAge)
     */
    public void update(String petName, AnimalType petBreed, Integer petAge) {
        this.petName = petName;
        this.petBreed = petBreed;
        this.petAge = petAge;
    }

    /**
     * pet_weight까지 같이 갱신이 필요할 때 사용 (선택)
     */
    public void updateWeight(PetWeight petWeight) {
        this.petWeight = petWeight;
    }

    public Long getPetId() {
        return petId;
    }

    public Long getUserId() {
        return userId;
    }

    public String getPetName() {
        return petName;
    }

    public AnimalType getPetBreed() {
        return petBreed;
    }

    public Integer getPetAge() {
        return petAge;
    }

    public PetWeight getPetWeight() {
        return petWeight;
    }
}
