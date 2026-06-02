package com.popups.pupoo.auth.application;

import com.popups.pupoo.auth.dto.KakaoExchangeResponse;
import com.popups.pupoo.auth.dto.KakaoOauthLoginResponse;
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
public class KakaoOAuthService {

    private final WebClient webClient;
    private final SocialAccountRepository socialAccountRepository;
    private final UserRepository userRepository;
    private final AuthService authService;

    @Value("${kakao.oauth.client-id}")
    private String clientId;

    @Value("${kakao.oauth.client-secret:}")
    private String clientSecret;

    @Value("${kakao.oauth.redirect-uri}")
    private String redirectUri;

    public KakaoOAuthService(
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
    public KakaoOauthLoginResponse login(String code, String redirectUri, HttpServletResponse response) {
        KakaoExchangeResponse profile = exchange(code, redirectUri);

        String providerUid = profile.getProviderUid();
        String email = profile.getEmail();
        String nickname = profile.getNickname();

        Optional<SocialAccount> socialOpt =
                socialAccountRepository.findByProviderAndProviderUid(SocialProvider.KAKAO, providerUid);

        if (socialOpt.isPresent()) {
            SocialAccount socialAccount = socialOpt.get();
            Optional<User> linkedUser = userRepository.findById(socialAccount.getUserId());

            if (linkedUser.isEmpty()) {
                log.warn("[KAKAO] orphan social link detected. providerUid={}, userId={}",
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

                if (!socialAccountRepository.existsByUserIdAndProvider(user.getUserId(), SocialProvider.KAKAO)) {
                    if (socialAccountRepository.findByProviderAndProviderUid(SocialProvider.KAKAO, providerUid).isPresent()) {
                        throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE);
                    }

                    try {
                        socialAccountRepository.save(new SocialAccount(
                                user.getUserId(),
                                SocialProvider.KAKAO,
                                providerUid
                        ));
                    } catch (DataIntegrityViolationException e) {
                        socialAccountRepository.findByProviderAndProviderUid(SocialProvider.KAKAO, providerUid)
                                .orElseThrow(() -> new BusinessException(ErrorCode.DUPLICATE_RESOURCE));
                    }
                }

                return toExistingUserLogin(user, response);
            }
        }

        return KakaoOauthLoginResponse.builder()
                .newUser(true)
                .email(email)
                .nickname(nickname)
                .socialProvider("KAKAO")
                .socialProviderUid(providerUid)
                .build();
    }

    public KakaoExchangeResponse exchange(String code, String redirectUri) {
        if (code == null || code.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED);
        }

        if (clientId == null || clientId.isBlank() || this.redirectUri == null || this.redirectUri.isBlank()) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR);
        }

        String resolvedRedirectUri = resolveRedirectUri(redirectUri);
        String secret = clientSecret == null ? "" : clientSecret.trim();
        log.warn("[KAKAO][DEBUG] token req: clientIdPrefix={}, redirectUri={}, hasSecret={}, secretLenTrim={}",
                mask(clientId, 6),
                resolvedRedirectUri,
                !secret.isBlank(),
                secret.length());

        try {
            var form = BodyInserters
                    .fromFormData("grant_type", "authorization_code")
                    .with("client_id", clientId)
                    .with("redirect_uri", resolvedRedirectUri)
                    .with("code", code);

            if (clientSecret != null && !clientSecret.isBlank()) {
                form = form.with("client_secret", clientSecret);
            }

            Map<String, Object> token = webClient.post()
                    .uri("https://kauth.kakao.com/oauth/token")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

            String accessToken = token == null ? null : (String) token.get("access_token");
            if (accessToken == null || accessToken.isBlank()) {
                log.warn("[KAKAO] token api returned empty access_token. token={}", safeBody(String.valueOf(token)));
                throw new BusinessException(ErrorCode.INVALID_REQUEST);
            }

            Map<String, Object> me = webClient.get()
                    .uri("https://kapi.kakao.com/v2/user/me")
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

            if (me == null || me.get("id") == null) {
                log.warn("[KAKAO] me api returned null or missing id. me={}", safeBody(String.valueOf(me)));
                throw new BusinessException(ErrorCode.INVALID_REQUEST);
            }

            String providerUid = String.valueOf(me.get("id"));
            String email = null;
            String nickname = null;

            @SuppressWarnings("unchecked")
            Map<String, Object> kakaoAccount = (Map<String, Object>) me.get("kakao_account");
            if (kakaoAccount != null) {
                email = (String) kakaoAccount.get("email");

                @SuppressWarnings("unchecked")
                Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");
                if (profile != null) {
                    nickname = (String) profile.get("nickname");
                }
            }

            return new KakaoExchangeResponse(providerUid, email, nickname);
        } catch (WebClientResponseException e) {
            log.warn("[KAKAO] api failed: status={}, body={}", e.getStatusCode(), safeBody(e.getResponseBodyAsString()));
            throw new BusinessException(ErrorCode.INVALID_REQUEST);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("[KAKAO] unexpected error", e);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR);
        }
    }

    private KakaoOauthLoginResponse toExistingUserLogin(User user, HttpServletResponse response) {
        var loginResponse = authService.loginByUser(user, response);

        return KakaoOauthLoginResponse.builder()
                .newUser(false)
                .accessToken(loginResponse.getAccessToken())
                .userId(loginResponse.getUserId())
                .roleName(loginResponse.getRoleName())
                .build();
    }

    private String mask(String value, int prefix) {
        if (value == null) {
            return null;
        }
        if (value.length() <= prefix) {
            return value;
        }
        return value.substring(0, prefix) + "****";
    }

    private String safeBody(String body) {
        if (body == null) {
            return null;
        }
        return body.length() > 300 ? body.substring(0, 300) + "..." : body;
    }

    private String resolveRedirectUri(String clientRedirectUri) {
        if (clientRedirectUri == null || clientRedirectUri.isBlank()) {
            return redirectUri;
        }
        return clientRedirectUri.trim();
    }
}
