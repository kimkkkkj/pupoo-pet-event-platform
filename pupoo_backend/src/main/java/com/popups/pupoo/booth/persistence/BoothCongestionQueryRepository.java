// file: src/main/java/com/popups/pupoo/booth/persistence/BoothCongestionQueryRepository.java
package com.popups.pupoo.booth.persistence;

import com.popups.pupoo.booth.dto.BoothCongestionResponse;

import java.util.Optional;

public interface BoothCongestionQueryRepository {
    Optional<BoothCongestionResponse> findLatestByBoothId(Long boothId);
}
