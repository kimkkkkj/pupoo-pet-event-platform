// file: src/main/java/com/popups/pupoo/interest/domain/model/Interest.java
package com.popups.pupoo.interest.domain.model;

import com.popups.pupoo.interest.domain.enums.InterestName;
import com.popups.pupoo.interest.domain.enums.InterestType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import static lombok.AccessLevel.PROTECTED;

/**
 * Interest (관심 항목 마스터)
 *
 * [DB: interests]
 * - interest_id BIGINT PK AI
 * - interest_name ENUM(...)
 * - type ENUM('SYSTEM','USER')
 * - is_active TINYINT(1)
 * - created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 */
@Getter
@NoArgsConstructor(access = PROTECTED)
@Entity
@Table(name = "interests")
public class Interest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "interest_id", nullable = false)
    private Long interestId;

    @Enumerated(EnumType.STRING)
    @Column(name = "interest_name", nullable = false, length = 50, columnDefinition = "ENUM('EVENT','SESSION','EXPERIENCE','BOOTH','CONTEST','NOTICE','SNACK','BATH_SUPPLIES','GROOMING','TOY','CLOTHING','HEALTH','TRAINING','WALK','SUPPLEMENTS','ACCESSORIES','OTHERS')")
    private InterestName interestName;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private InterestType type;

    /**
     * Hibernate 6 + MySQL 안전 매핑
     * DB는 TINYINT(1)
     */
    @Column(name = "is_active", nullable = false, columnDefinition = "TINYINT(1)")
    private boolean isActive;

    /**
     * DB default CURRENT_TIMESTAMP
     */
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public void deactivate() {
        this.isActive = false;
    }

    public void activate() {
        this.isActive = true;
    }
}
