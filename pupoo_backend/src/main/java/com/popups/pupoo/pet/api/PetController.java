// file: src/main/java/com/popups/pupoo/pet/api/PetController.java
package com.popups.pupoo.pet.api;

import com.popups.pupoo.auth.security.util.SecurityUtil;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.MessageResponse;
import com.popups.pupoo.pet.application.PetService;
import com.popups.pupoo.pet.dto.PetCreateRequest;
import com.popups.pupoo.pet.dto.PetMeResponse;
import com.popups.pupoo.pet.dto.PetUpdateRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * Pet API
 *
 * URL 매핑(설계 기준):
 * - POST   /api/pets           : 반려동물 등록(소유자=user) 및 종/견종/나이 검증 후 저장
 * - PATCH  /api/pets/{petId}   : 소유권 검증 후 반려동물 정보 수정
 * - DELETE /api/pets/{petId}   : 소유권 검증 후 반려동물 삭제(soft/hard 정책)
 * - GET    /api/pets/me        : 내 반려동물 목록 조회(공개설정 반영)
 */
@RestController
@RequestMapping("/api/pets")
public class PetController {

    private final PetService petService;
    private final SecurityUtil securityUtil;

    public PetController(PetService petService, SecurityUtil securityUtil) {
        this.petService = petService;
        this.securityUtil = securityUtil;
    }

    /**
     * 반려동물 등록
     * - 소유자=user (현재 로그인 userId)
     * - @Valid로 DTO 검증 수행
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Long> create(@Valid @RequestBody PetCreateRequest request) {
        Long userId = securityUtil.currentUserId();
        Long petId = petService.create(userId, request);
        return ApiResponse.success(petId);
    }

    /**
     * 내 반려동물 목록 조회
     */
    @GetMapping("/me")
    public ApiResponse<PetMeResponse> getMe() {
        Long userId = securityUtil.currentUserId();
        PetMeResponse response = petService.getMe(userId);
        return ApiResponse.success(response);
    }

    /**
     * 반려동물 정보 수정
     * - 소유권 검증은 Service에서 수행
     * - @Valid로 DTO 검증 수행
     */
    @PatchMapping("/{petId}")
    public ApiResponse<PetMeResponse> update(
            @PathVariable Long petId,
            @Valid @RequestBody PetUpdateRequest request
    ) {
        Long userId = securityUtil.currentUserId();
        petService.update(userId, petId, request);
        return ApiResponse.success(petService.getMe(userId));
    }

    /**
     * 반려동물 삭제
     * - 소유권 검증은 Service에서 수행
     * - 현재 DB/Entity에 soft delete 컬럼이 없으므로 hard delete로 동작
     *   (soft delete 필요 시: is_deleted/status 컬럼 추가 후 delete 로직 변경)
     */
    @DeleteMapping("/{petId}")
    public ApiResponse<MessageResponse> delete(@PathVariable Long petId) {
        Long userId = securityUtil.currentUserId();
        petService.delete(userId, petId);
        return ApiResponse.success(new MessageResponse("PET_DELETED"));
    }
}
