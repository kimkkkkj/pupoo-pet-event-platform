package com.popups.pupoo.event.application;

import com.popups.pupoo.ai.client.AiInferenceClient;
import com.popups.pupoo.ai.dto.AiPosterGenerateResponse;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.event.dto.AdminEventPosterAssetResponse;
import com.popups.pupoo.event.dto.AdminEventPosterGenerateRequest;
import com.popups.pupoo.storage.infrastructure.StorageKeyGenerator;
import com.popups.pupoo.storage.port.ObjectStoragePort;
import com.popups.pupoo.storage.support.StorageUrlResolver;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AdminEventPosterServiceTest {

    @Test
    void generatePoster_delegatesToAiServiceAndMapsResponse() {
        AiInferenceClient aiInferenceClient = mock(AiInferenceClient.class);
        when(aiInferenceClient.generatePoster(any(AdminEventPosterGenerateRequest.class)))
                .thenReturn(Optional.of(new AiPosterGenerateResponse(
                        "https://cdn.pupoo.site/uploads/posters/generated/poster.png",
                        "uploads/posters/generated/poster.png",
                        "poster.png"
                )));

        AdminEventPosterService service = new AdminEventPosterService(
                RestClient.builder(),
                mock(ObjectStoragePort.class),
                mock(StorageKeyGenerator.class),
                mock(StorageUrlResolver.class),
                aiInferenceClient,
                "",
                "",
                "https://api.openai.com"
        );

        AdminEventPosterAssetResponse response = service.generatePoster(request());

        assertThat(response.imageUrl()).isEqualTo("https://cdn.pupoo.site/uploads/posters/generated/poster.png");
        assertThat(response.storedName()).isEqualTo("poster.png");
    }

    @Test
    void generatePoster_throwsWhenAiServiceReturnsEmpty() {
        AiInferenceClient aiInferenceClient = mock(AiInferenceClient.class);
        when(aiInferenceClient.generatePoster(any(AdminEventPosterGenerateRequest.class)))
                .thenReturn(Optional.empty());

        AdminEventPosterService service = new AdminEventPosterService(
                RestClient.builder(),
                mock(ObjectStoragePort.class),
                mock(StorageKeyGenerator.class),
                mock(StorageUrlResolver.class),
                aiInferenceClient,
                "",
                "",
                "https://api.openai.com"
        );

        assertThatThrownBy(() -> service.generatePoster(request()))
                .isInstanceOf(BusinessException.class)
                .hasMessage("AI poster generation failed");
    }

    private AdminEventPosterGenerateRequest request() {
        return new AdminEventPosterGenerateRequest(
                "Spring Picnic",
                "Pet event by the river",
                LocalDateTime.of(2026, 4, 20, 10, 0),
                LocalDateTime.of(2026, 4, 20, 18, 0),
                "Seoul Riverside Park",
                "Bright spring tone"
        );
    }
}
