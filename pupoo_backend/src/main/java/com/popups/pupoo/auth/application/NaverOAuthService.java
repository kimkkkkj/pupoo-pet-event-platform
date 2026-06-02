package com.popups.pupoo.auth.application;

import com.popups.pupoo.auth.dto.NaverExchangeResponse;
import com.popups.pupoo.auth.dto.NaverOauthLoginResponse;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.user.domain.model.User;
import com.popups.pupoo.user.persistence.UserRepository;
import com.popups.pupoo.user.social.domain.enums.SocialProvider;
import com.popups.pupoo.user.social.domain.model.SocialAccount;
import com.popups.pupoo.user.social.persistence.SocialAccountRepository;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
public class NaverOAuthService {

    private final WebClient webClient;
    private final SocialAccountRepository socialAccountRepository;
    private final UserRepository userRepository;
    private final AuthService authService;

    @Value("${naver.oauth.client-id}")
    private String clientId;

    @Value("${naver.oauth.client-secret}")
    private String clientSecret;

    @Value("${naver.oauth.redirect-uri}")
    private String redirectUri;

    public NaverOAuthService(
            WebClient.Builder builder,
            SocialAccountRepository socialAccountRepository,
            UserRepository userRepository,
            AuthService authService
    ) {
        this.webClient = builder.build();
        this.socialAccountRepository = socialAccountRepository;
        this.userRepository = userRepository;
        this.authService = authService;
    }

    @Transactional
    public NaverOauthLoginResponse login(String code, String state, String redirectUri, HttpServletResponse response) {
        NaverExchangeResponse profile = exchange(code, state, redirectUri);

        String providerUid = profile.getProviderUid();
        String email = profile.getEmail();
        String nickname = profile.getNickname();

        Optional<SocialAccount> socialOpt =
                socialAccountRepository.findByProviderAndProviderUid(SocialProvider.NAVER, providerUid);

        if (socialOpt.isPresent()) {
            SocialAccount socialAccount = socialOpt.get();
            Optional<User> linkedUser = userRepository.findById(socialAccount.getUserId());

            if (linkedUser.isEmpty()) {
                log.warn("[NAVER] orphan social link detected. providerUid={}, userId={}",
                        providerUid, socialAccount.getUserId());
                socialAccountRepository.delete(socialAccount);
            } else {
                return toExistingUserLogin(linkedUser.get(), response);
            }
        }

        if (email != null && !email.isBlank()) {
            Optional<User> userOpt = userRepository.findByEmail(email);

            if (userOpt.isPresent()) {
                User user = userOpt.get();

                if (!socialAccountRepository.existsByUserIdAndProvider(user.getUserId(), SocialProvider.NAVER)) {
                    if (socialAccountRepository.findByProviderAndProviderUid(SocialProvider.NAVER, providerUid).isPresent()) {
                        throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE);
                    }

                    try {
                        socialAccountRepository.save(new SocialAccount(
                                user.getUserId(),
                                SocialProvider.NAVER,
                                providerUid
                        ));
                    } catch (DataIntegrityViolationException e) {
                        socialAccountRepository.findByProviderAndProviderUid(SocialProvider.NAVER, providerUid)
                                .orElseThrow(() -> new BusinessException(ErrorCode.DUPLICATE_RESOURCE));
                    }
                }

                return toExistingUserLogin(user, response);
            }
        }

        return NaverOauthLoginResponse.builder()
                .newUser(true)
                .email(email)
                .nickname(nickname)
                .socialProvider("NAVER")
                .socialProviderUid(providerUid)
                .build();
    }

    public NaverExchangeResponse exchange(String code, String state, String redirectUri) {
        if (code == null || code.isBlank() || state == null || state.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED);
        }

        if (clientId == null || clientId.isBlank()
                || clientSecret == null || clientSecret.isBlank()
                || this.redirectUri == null || this.redirectUri.isBlank()) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR);
        }

        String resolvedRedirectUri = resolveRedirectUri(redirectUri);

        try {
            Map<String, Object> token = webClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .scheme("https")
                            .host("nid.naver.com")
                            .path("/oauth2.0/token")
                            .queryParam("grant_type", "authorization_code")
                            .queryParam("client_id", clientId)
                            .queryParam("client_secret", clientSecret)
                            .queryParam("code", code)
                            .queryParam("state", state)
                            .queryParam("redirect_uri", resolvedRedirectUri)
                            .build())
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(BodyInserters.empty())
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

            String accessToken = token == null ? null : (String) token.get("access_token");
            if (accessToken == null || accessToken.isBlank()) {
                log.warn("[NAVER] token api returned empty access_token. token={}", safeBody(String.valueOf(token)));
                throw new BusinessException(ErrorCode.INVALID_REQUEST);
            }

            Map<String, Object> me = webClient.get()
                    .uri("https://openapi.naver.com/v1/nid/me")
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

            if (me == null || !"00".equals(String.valueOf(me.get("resultcode")))) {
                log.warn("[NAVER] me api failed. body={}", safeBody(String.valueOf(me)));
                throw new BusinessException(ErrorCode.INVALID_REQUEST);
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> profile = (Map<String, Object>) me.get("response");
            if (profile == null || profile.get("id") == null) {
                log.warn("[NAVER] me api missing profile id. body={}", safeBody(String.valueOf(me)));
                throw new BusinessException(ErrorCode.INVALID_REQUEST);
            }

            String providerUid = String.valueOf(profile.get("id"));
            String email = getString(profile.get("email"));
            String nickname = firstNonBlank(
                    getString(profile.get("nickname")),
                    getString(profile.get("name")),
                    getString(profile.get("email"))
            );

            return new NaverExchangeResponse(providerUid, email, nickname);
        } catch (WebClientResponseException e) {
            log.warn("[NAVER] api failed: status={}, body={}", e.getStatusCode(), safeBody(e.getResponseBodyAsString()));
            throw new BusinessException(ErrorCode.INVALID_REQUEST);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("[NAVER] unexpected error", e);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR);
        }
    }

    private NaverOauthLoginResponse toExistingUserLogin(User user, HttpServletResponse response) {
        var loginResponse = authService.loginByUser(user, response);

        return NaverOauthLoginResponse.builder()
                .newUser(false)
                .accessToken(loginResponse.getAccessToken())
                .userId(loginResponse.getUserId())
                .roleName(loginResponse.getRoleName())
                .build();
    }

    private String resolveRedirectUri(String clientRedirectUri) {
        if (clientRedirectUri == null || clientRedirectUri.isBlank()) {
            return redirectUri;
        }
        return clientRedirectUri.trim();
    }

    private String getString(Object value) {
        if (value == null) {
            return null;
        }
        String str = String.valueOf(value).trim();
        return str.isEmpty() ? null : str;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private String safeBody(String body) {
        if (body == null) {
            return null;
        }
        return body.length() > 300 ? body.substring(0, 300) + "..." : body;
    }
}
