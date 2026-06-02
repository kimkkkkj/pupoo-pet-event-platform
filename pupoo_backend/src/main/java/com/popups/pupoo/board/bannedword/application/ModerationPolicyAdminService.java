package com.popups.pupoo.board.bannedword.application;

import com.popups.pupoo.board.bannedword.config.ModerationProperties;
import com.popups.pupoo.board.bannedword.config.OrchestrateProperties;
import com.popups.pupoo.board.bannedword.domain.model.ModerationPolicyUpload;
import com.popups.pupoo.board.bannedword.dto.ActivePolicyResponse;
import com.popups.pupoo.board.bannedword.dto.ModerationPolicyArchiveResult;
import com.popups.pupoo.board.bannedword.dto.PolicyUploadActivateResponse;
import com.popups.pupoo.board.bannedword.persistence.ModerationPolicyUploadRepository;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class ModerationPolicyAdminService {

    private final @Qualifier("aiModerationWebClient") WebClient aiModerationWebClient;
    private final ModerationProperties properties;
    private final OrchestrateProperties orchestrateProperties;
    private final ModerationPolicyUploadService moderationPolicyUploadService;
    private final ModerationPolicyUploadRepository moderationPolicyUploadRepository;
    private final ModerationPolicyObjectArchiveService moderationPolicyObjectArchiveService;
    private final PolicyOrchestrateTriggerService policyOrchestrateTriggerService;

    @Transactional(readOnly = true)
    public ActivePolicyResponse getActivePolicy() {
        try {
            Map<?, ?> response = aiModerationWebClient
                    .get()
                    .uri("/internal/policies/active")
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(Duration.ofMillis(Math.max(1000, properties.getReadTimeoutMs()) + 500L));

            if (response == null) {
                throw new BusinessException(ErrorCode.INTERNAL_ERROR, "AI 서버 응답 없음");
            }
            return new ActivePolicyResponse(
                    (String) response.get("active_collection"),
                    (String) response.get("active_filename"),
                    (String) response.get("activated_at")
            );
        } catch (WebClientResponseException e) {
            log.warn("AI policies active API error: {} {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "AI 서버 오류로 정책 정보를 조회할 수 없습니다.");
        } catch (Exception e) {
            log.warn("AI policies active call failed", e);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "AI 서버 연결 실패로 정책 정보를 조회할 수 없습니다.");
        }
    }

    /**
     * 정책 업로드 → pupoo_ai 반영. DB 이력(moderation_policy_uploads)은 AI 호출 전후로 별도 트랜잭션으로 기록한다.
     */
    public PolicyUploadActivateResponse uploadAndActivate(MultipartFile file, Long uploadedByUserId) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "업로드할 정책 파일이 비어있습니다.");
        }

        final byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "파일을 읽을 수 없습니다.");
        }

        String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "";
        String ext = extractFileExt(original);
        var pending = moderationPolicyUploadService.createPending(bytes, original, ext, uploadedByUserId);
        Long uploadId = pending.getPolicyUploadId();

        Optional<ModerationPolicyArchiveResult> archiveOpt =
                moderationPolicyObjectArchiveService.archive(bytes, original, uploadId);
        archiveOpt.ifPresent(r -> moderationPolicyUploadService.attachStorage(
                uploadId,
                r.storageProvider(),
                r.storageBucket(),
                r.objectKey(),
                r.storageUri()));

        if (orchestrateProperties.isDispatchOnly()) {
            if (archiveOpt.isEmpty()) {
                moderationPolicyUploadService.markFailed(uploadId,
                        "DISPATCH_ONLY: 객체 스토리지에 정책 파일을 저장하지 못했습니다. app.storage(S3/COS) 설정을 확인하세요.");
                throw new BusinessException(ErrorCode.INTERNAL_ERROR,
                        "객체 스토리지 저장에 실패하여 Orchestrate 로 전달할 수 없습니다.");
            }
            try {
                orchestrateProperties.resolveTriggerUri();
            } catch (IllegalStateException e) {
                moderationPolicyUploadService.markFailed(uploadId, "Orchestrate URL 미설정: " + e.getMessage());
                throw new BusinessException(ErrorCode.INTERNAL_ERROR,
                        "Orchestrate 웹훅 URL 이 설정되지 않았습니다. ai.orchestrate.webhook-url 또는 base-url 을 확인하세요.");
            }
            ModerationPolicyUpload row = moderationPolicyUploadRepository.findById(uploadId).orElseThrow();
            String orchErr = policyOrchestrateTriggerService.safeTriggerDispatch(row, archiveOpt.get());
            if (orchErr != null) {
                moderationPolicyUploadService.markFailed(uploadId, "Orchestrate: " + orchErr);
                throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Orchestrate 트리거에 실패했습니다.");
            }
            moderationPolicyUploadService.markOrchestrationDispatched(uploadId);
            return new PolicyUploadActivateResponse(
                    uploadId,
                    "dispatched",
                    null,
                    original.isEmpty() ? null : original,
                    null,
                    null);
        }

        try {
            MultipartBodyBuilder builder = new MultipartBodyBuilder();
            builder.part("file", new ByteArrayResource(bytes) {
                        @Override
                        public String getFilename() {
                            return file.getOriginalFilename();
                        }
                    })
                    .header("Content-Type", MediaType.APPLICATION_OCTET_STREAM_VALUE);

            // Content-Type 을 직접 넣으면 boundary 가 없어 AI(FastAPI)가 multipart 를 파싱하지 못함 — WebClient 가 자동 설정
            Map<?, ?> response = aiModerationWebClient
                    .post()
                    .uri("/internal/policies/upload-and-activate")
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(Duration.ofMillis(Math.max(1000, properties.getReadTimeoutMs()) + 500L));

            if (response == null) {
                moderationPolicyUploadService.markFailed(uploadId, "AI 서버 응답 없음");
                throw new BusinessException(ErrorCode.INTERNAL_ERROR, "AI 서버 응답 없음");
            }

            String status = response.get("status") instanceof String s ? s : String.valueOf(response.get("status"));
            if (!"ok".equalsIgnoreCase(status != null ? status.trim() : "")) {
                moderationPolicyUploadService.markFailed(uploadId, "AI 응답 status 불일치: " + status);
                throw new BusinessException(ErrorCode.INTERNAL_ERROR, "AI 서버가 정책 반영에 실패했습니다.");
            }

            String collection = (String) response.get("active_collection");
            String activeFilename = (String) response.get("active_filename");
            Integer chunkCount = response.get("chunk_count") instanceof Number n ? n.intValue() : null;
            Integer embeddingDim = response.get("embedding_dim") instanceof Number n ? n.intValue() : null;

            moderationPolicyUploadService.markSuccess(uploadId, collection, activeFilename, chunkCount, embeddingDim);

            if (orchestrateProperties.isNotifyAfterSuccess()) {
                try {
                    orchestrateProperties.resolveTriggerUri();
                    ModerationPolicyUpload row = moderationPolicyUploadRepository.findById(uploadId).orElse(null);
                    ModerationPolicyArchiveResult arc = archiveOpt.orElse(null);
                    if (row != null) {
                        CompletableFuture.runAsync(() -> {
                            try {
                                policyOrchestrateTriggerService.triggerNotifySuccess(
                                        row, arc, collection, activeFilename, chunkCount, embeddingDim);
                            } catch (Exception ex) {
                                log.warn("Orchestrate NOTIFY_AFTER_SUCCESS failed: {}", ex.toString());
                            }
                        });
                    }
                } catch (IllegalStateException e) {
                    log.warn("orchestrate notify skipped: {}", e.getMessage());
                }
            }

            return new PolicyUploadActivateResponse(
                    uploadId,
                    status,
                    collection,
                    activeFilename,
                    chunkCount,
                    embeddingDim
            );
        } catch (WebClientResponseException e) {
            String detail = e.getStatusCode() + " " + e.getResponseBodyAsString();
            log.warn("AI policy upload/activate API error: {}", detail);
            moderationPolicyUploadService.markFailed(uploadId, detail);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "AI 서버 오류로 정책 반영에 실패했습니다.");
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("AI policy upload/activate call failed", e);
            moderationPolicyUploadService.markFailed(uploadId, e.getMessage());
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "AI 서버 연결 실패로 정책 반영에 실패했습니다.");
        }
    }

    private static String extractFileExt(String filename) {
        if (filename == null || filename.isEmpty()) {
            return null;
        }
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) {
            return null;
        }
        String ext = filename.substring(dot).toLowerCase(Locale.ROOT);
        return ext.length() > 16 ? ext.substring(0, 16) : ext;
    }
}
