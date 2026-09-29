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
                        "poster.png",
                        null,
                        null
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
    void generatePoster_storesReturnedImageBytesInBackendStorage() {
        AiInferenceClient aiInferenceClient = mock(AiInferenceClient.class);
        byte[] image = new byte[] {1, 2, 3};
        when(aiInferenceClient.generatePoster(any(AdminEventPosterGenerateRequest.class)))
                .thenReturn(Optional.of(new AiPosterGenerateResponse(
                        "",
                        "",
                        null,
                        java.util.Base64.getEncoder().encodeToString(image),
                        "image/jpeg"
                )));
        ObjectStoragePort storage = mock(ObjectStoragePort.class);
        StorageKeyGenerator keyGenerator = mock(StorageKeyGenerator.class);
        StorageUrlResolver urlResolver = mock(StorageUrlResolver.class);
        when(keyGenerator.generateStandaloneKey("event", "poster.jpg")).thenReturn("uploads/event/abc.jpg");
        when(urlResolver.toPublicUrlFromKey("uploads/event/abc.jpg")).thenReturn("http://localhost:8080/uploads/event/abc.jpg");

        AdminEventPosterService service = new AdminEventPosterService(
                RestClient.builder(),
                storage,
                keyGenerator,
                urlResolver,
                aiInferenceClient,
                "",
                "",
                "https://api.openai.com"
        );

        AdminEventPosterAssetResponse response = service.generatePoster(request());

        org.mockito.Mockito.verify(storage).putObject(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.eq("uploads/event/abc.jpg"),
                org.mockito.ArgumentMatchers.eq(image),
                org.mockito.ArgumentMatchers.eq("image/jpeg"));
        assertThat(response.imageUrl()).isEqualTo("http://localhost:8080/uploads/event/abc.jpg");
        assertThat(response.storedName()).isEqualTo("abc.jpg");
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
                .hasMessageContaining("AI 포스터를 만들지 못했어요");
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
