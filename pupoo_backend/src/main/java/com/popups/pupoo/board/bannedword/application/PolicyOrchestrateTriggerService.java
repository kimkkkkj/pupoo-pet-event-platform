package com.popups.pupoo.board.bannedword.application;

import com.popups.pupoo.board.bannedword.config.ModerationProperties;
import com.popups.pupoo.board.bannedword.config.OrchestrateProperties;
import com.popups.pupoo.board.bannedword.domain.model.ModerationPolicyUpload;
import com.popups.pupoo.board.bannedword.dto.ModerationPolicyArchiveResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 정책 업로드 후 Orchestrate(또는 사용자 정의 웹훅)로 이벤트를 전달한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PolicyOrchestrateTriggerService {

    public static final String EVENT_ARCHIVED = "pupoo.moderation_policy.archived";
    public static final String EVENT_APPLIED = "pupoo.moderation_policy.applied";

    private final OrchestrateProperties orchestrateProperties;
    private final ModerationProperties moderationProperties;
    private final @Qualifier("orchestrateWebClient") WebClient orchestrateWebClient;

    /**
     * 객체 스토리지 저장 직후: Orchestrate 가 COS/S3 에서 내려받아 parse→embed→activate 스킬을 돌릴 때 사용.
     */
    public void triggerDispatch(ModerationPolicyUpload row, ModerationPolicyArchiveResult archive) {
        Map<String, Object> body = baseArchivedPayload(row, archive);
        body.put("phase", "DISPATCH_ONLY");
        body.put("pupooAi", pupooAiHints());
        postJson(orchestrateProperties.resolveTriggerUri(), body);
    }

    /**
     * 동기 AI 반영 성공 후: 감사·연동용 알림 (실패해도 업로드 API 는 이미 성공 처리됨).
     */
    public void triggerNotifySuccess(
            ModerationPolicyUpload row,
            ModerationPolicyArchiveResult archive,
            String activeCollection,
            String activeFilename,
            Integer chunkCount,
            Integer embeddingDim) {
        Map<String, Object> body = baseArchivedPayload(row, archive);
        body.put("phase", "NOTIFY_AFTER_SUCCESS");
        body.put("milvusCollectionName", activeCollection);
        body.put("activePolicyFilename", activeFilename);
        body.put("chunkCount", chunkCount);
        body.put("embeddingDim", embeddingDim);
        body.put("event", EVENT_APPLIED);
        body.put("pupooAi", pupooAiHints());
        postJson(orchestrateProperties.resolveTriggerUri(), body);
    }

    private Map<String, Object> baseArchivedPayload(ModerationPolicyUpload row, ModerationPolicyArchiveResult archive) {
        Map<String, Object> storage = new LinkedHashMap<>();
        if (archive != null) {
            storage.put("provider", archive.storageProvider());
            storage.put("bucket", archive.storageBucket());
            storage.put("objectKey", archive.objectKey());
            storage.put("uri", archive.storageUri());
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("event", EVENT_ARCHIVED);
        body.put("policyUploadId", row.getPolicyUploadId());
        body.put("originalFilename", row.getOriginalFilename());
        body.put("fileExt", row.getFileExt());
        body.put("uploadedByUserId", row.getUploadedByUserId());
        body.put("contentSha256", row.getContentSha256());
        body.put("storage", storage);
        return body;
    }

    private Map<String, String> pupooAiHints() {
        Map<String, String> m = new LinkedHashMap<>();
        String base = moderationProperties.getBaseUrl() != null ? moderationProperties.getBaseUrl().trim() : "";
        m.put("baseUrl", base);
        m.put("parseTxtPath", "/internal/policies/parse-txt");
        m.put("embedPath", "/internal/policies/embed");
        m.put("activatePath", "/internal/policies/activate");
        m.put("uploadAndActivatePath", "/internal/policies/upload-and-activate");
        m.put("note", "스킬에서 X-Internal-Token 은 Orchestrate 시크릿/환경변수로 설정하고 응답 본문에 토큰을 넣지 않는다.");
        return m;
    }

    private void postJson(java.net.URI uri, Map<String, Object> body) {
        orchestrateWebClient.post()
                .uri(uri)
                .headers(h -> {
                    if (StringUtils.hasText(orchestrateProperties.getBearerToken())) {
                        h.setBearerAuth(orchestrateProperties.getBearerToken().trim());
                    }
                    if (StringUtils.hasText(orchestrateProperties.getExtraHeaderName())
                            && StringUtils.hasText(orchestrateProperties.getExtraHeaderValue())) {
                        h.add(orchestrateProperties.getExtraHeaderName().trim(),
                                orchestrateProperties.getExtraHeaderValue().trim());
                    }
                })
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .toBodilessEntity()
                .block(Duration.ofSeconds(orchestrateProperties.getTimeoutSeconds()));
    }

    /**
     * HTTP 오류 시 예외 메시지 (이력/사용자 메시지용).
     */
    public String safeTriggerDispatch(ModerationPolicyUpload row, ModerationPolicyArchiveResult archive) {
        try {
            triggerDispatch(row, archive);
            return null;
        } catch (WebClientResponseException e) {
            return e.getStatusCode() + " " + e.getResponseBodyAsString();
        } catch (Exception e) {
            return e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
        }
    }
}
