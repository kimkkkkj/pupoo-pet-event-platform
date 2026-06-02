// file: src/main/java/com/popups/pupoo/pet/domain/enums/AnimalType.java
package com.popups.pupoo.pet.domain.enums;

/**
 * DB pet.pet_breed ENUM('DOG','CAT','OTHER') 와 1:1 매핑
 * - '품종'이 아니라 '동물 종류(종)' 개념
 */
public enum AnimalType {
    DOG,
    CAT,
    OTHER
}
