package com.popups.pupoo.auth.application;

import com.popups.pupoo.user.persistence.UserRepository;
import com.popups.pupoo.user.social.persistence.SocialAccountRepository;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.WebClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class GoogleOAuthServiceTest {

    private GoogleOAuthService createService(String defaultRedirectUri) {
        GoogleOAuthService service = new GoogleOAuthService(
                WebClient.builder(),
                mock(SocialAccountRepository.class),
                mock(UserRepository.class),
                mock(AuthService.class)
        );
        ReflectionTestUtils.setField(service, "defaultRedirectUri", defaultRedirectUri);
        return service;
    }

    @Test
    void resolveRedirectUriUsesDefaultWhenClientUriIsBlank() {
        GoogleOAuthService service = createService("https://www.pupoo.site/auth/google/callback");

        String resolved = service.resolveRedirectUri("   ");

        assertThat(resolved).isEqualTo("https://www.pupoo.site/auth/google/callback");
    }

    @Test
    void resolveRedirectUriKeepsCanonicalProductionUri() {
        GoogleOAuthService service = createService("https://www.pupoo.site/auth/google/callback");

        String resolved = service.resolveRedirectUri("https://www.pupoo.site/auth/google/callback");

        assertThat(resolved).isEqualTo("https://www.pupoo.site/auth/google/callback");
    }

    @Test
    void resolveRedirectUriFallsBackWhenNonCanonicalHostIsRequested() {
        GoogleOAuthService service = createService("https://www.pupoo.site/auth/google/callback");

        String resolved = service.resolveRedirectUri("https://pupoo.site/auth/google/callback");

        assertThat(resolved).isEqualTo("https://www.pupoo.site/auth/google/callback");
    }

    @Test
    void resolveRedirectUriAllowsLocalDevelopmentCallbacks() {
        GoogleOAuthService service = createService("https://www.pupoo.site/auth/google/callback");

        String resolved = service.resolveRedirectUri("http://localhost:5173/auth/google/callback");

        assertThat(resolved).isEqualTo("http://localhost:5173/auth/google/callback");
    }
}
