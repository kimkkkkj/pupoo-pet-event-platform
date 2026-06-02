// file: src/main/java/com/popups/pupoo/auth/persistence/RefreshTokenRepository.java
package com.popups.pupoo.auth.persistence;

import com.popups.pupoo.auth.domain.model.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByToken(String token);

    void deleteByToken(String token);

    void deleteAllByUserId(Long userId);
}
