// file: src/main/java/com/popups/pupoo/auth/api/AuthController.java
package com.popups.pupoo.auth.api;

import com.popups.pupoo.auth.application.AuthService;
import com.popups.pupoo.auth.application.GoogleOAuthService;
import com.popups.pupoo.auth.application.KakaoOAuthService;
import com.popups.pupoo.auth.application.NaverOAuthService;
import com.popups.pupoo.auth.application.PasswordResetService;
import com.popups.pupoo.auth.application.SignupSessionService;
import com.popups.pupoo.auth.dto.EmailVerificationRequestResponse;
import com.popups.pupoo.auth.dto.GoogleOauthLoginRequest;
import com.popups.pupoo.auth.dto.GoogleOauthLoginResponse;
import com.popups.pupoo.auth.dto.KakaoExchangeRequest;
import com.popups.pupoo.auth.dto.KakaoExchangeResponse;
import com.popups.pupoo.auth.dto.KakaoOauthLoginRequest;
import com.popups.pupoo.auth.dto.KakaoOauthLoginResponse;
import com.popups.pupoo.auth.dto.LoginRequest;
import com.popups.pupoo.auth.dto.LoginResponse;
import com.popups.pupoo.auth.dto.NaverOauthLoginRequest;
import com.popups.pupoo.auth.dto.NaverOauthLoginResponse;
import com.popups.pupoo.auth.dto.PasswordResetConfirmRequest;
import com.popups.pupoo.auth.dto.PasswordResetRequest;
import com.popups.pupoo.auth.dto.PasswordResetRequestResponse;
import com.popups.pupoo.auth.dto.PasswordResetVerifyRequest;
import com.popups.pupoo.auth.dto.SignupCompleteRequest;
import com.popups.pupoo.auth.dto.SignupEmailConfirmRequest;
import com.popups.pupoo.auth.dto.SignupEmailRequest;
import com.popups.pupoo.auth.dto.SignupStartRequest;
import com.popups.pupoo.auth.dto.SignupStartResponse;
import com.popups.pupoo.auth.dto.SignupVerifyOtpRequest;
import com.popups.pupoo.auth.dto.TokenResponse;
import com.popups.pupoo.auth.support.RefreshCookieRequestSupport;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.MessageResponse;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/**
 * 인증 공개 API와 인증 완료 후 세션 유지 API를 제공한다.
 * 회원가입, 일반 로그인, 소셜 로그인, 비밀번호 재설정, refresh/logout 흐름을 각각 전용 Service에 위임한다.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String REFRESH_COOKIE_NAME = "refresh_token";

    private final AuthService authService;
    private final SignupSessionService signupSessionService;
    private final KakaoOAuthService kakaoOAuthService;
    private final GoogleOAuthService googleOAuthService;
    private final NaverOAuthService naverOAuthService;
    private final PasswordResetService passwordResetService;
    private final boolean refreshCookieSecure;
    private final String refreshCookiePath;

    public AuthController(AuthService authService,
                          SignupSessionService signupSessionService,
                          KakaoOAuthService kakaoOAuthService,
                          GoogleOAuthService googleOAuthService,
                          NaverOAuthService naverOAuthService,
                          PasswordResetService passwordResetService,
                          @Value("${auth.refresh.cookie.secure:true}") boolean refreshCookieSecure,
                          @Value("${auth.refresh.cookie.path:/api/auth}") String refreshCookiePath) {
        this.authService = authService;
        this.signupSessionService = signupSessionService;
        this.kakaoOAuthService = kakaoOAuthService;
        this.googleOAuthService = googleOAuthService;
        this.naverOAuthService = naverOAuthService;
        this.passwordResetService = passwordResetService;
        this.refreshCookieSecure = refreshCookieSecure;
        this.refreshCookiePath = refreshCookiePath;
    }

    /**
     * 회원가입 세션을 시작한다.
     * 인증은 필요 없으며, 실제 `users` 행 생성은 하지 않고 OTP 발송과 세션 생성만 수행한다.
     * `SignupSessionService.start`가 발송 제한과 세션 만료 정책을 함께 처리한다.
     */
    @PostMapping("/signup/start")
    public ApiResponse<SignupStartResponse> signupStart(@RequestBody SignupStartRequest req) {
        return ApiResponse.success(signupSessionService.start(req));
    }

    /**
     * 회원가입 세션의 휴대폰 OTP를 검증한다.
     * 인증은 필요 없으며, 성공하면 세션의 `otp_status`가 `VERIFIED`로 전이된다.
     * `SignupSessionService.verifyOtp`가 실패 횟수와 차단 시간을 함께 관리한다.
     */
    @PostMapping("/signup/verify-otp")
    public ApiResponse<MessageResponse> signupVerifyOtp(@RequestBody SignupVerifyOtpRequest req) {
        signupSessionService.verifyOtp(req);
        return ApiResponse.success(new MessageResponse("OTP_VERIFIED"));
    }

    /**
     * 이메일 가입 세션에만 인증 메일을 발송한다.
     * OTP 검증이 끝난 뒤에만 호출할 수 있으며, 응답은 메일 인증 만료 시각을 담는다.
     * 실제 발송과 토큰 생성은 `SignupSessionService.requestEmail`이 처리한다.
     */
    @PostMapping("/signup/email/request")
    public ApiResponse<EmailVerificationRequestResponse> signupEmailRequest(@RequestBody SignupEmailRequest req) {
        return ApiResponse.success(signupSessionService.requestEmail(req));
    }

    /**
     * 이메일 가입 세션의 이메일 인증 코드를 확정한다.
     * 인증은 필요 없으며, 성공하면 세션의 `email_status`가 `VERIFIED`로 바뀐다.
     * `SignupSessionService.confirmEmail`이 만료와 실패 횟수를 검증한다.
     */
    @PostMapping("/signup/email/confirm")
    public ApiResponse<MessageResponse> signupEmailConfirm(@RequestBody SignupEmailConfirmRequest req) {
        signupSessionService.confirmEmail(req);
        return ApiResponse.success(new MessageResponse("EMAIL_VERIFIED"));
    }

    /**
     * 회원가입 세션을 실제 사용자 계정으로 전환한다.
     * OTP는 필수이고, 이메일 가입은 이메일 인증까지 끝나야 한다.
     * `SignupSessionService.complete`가 `users` 생성과 access/refresh 발급을 함께 수행한다.
     */
    @PostMapping("/signup/complete")
    public ApiResponse<LoginResponse> signupComplete(@RequestBody SignupCompleteRequest req, HttpServletResponse response) {
        return ApiResponse.success(signupSessionService.complete(req, response));
    }

    /**
     * 카카오 인가 코드를 카카오 토큰 교환 결과로 바꾼다.
     * 인증은 필요 없으며, `KakaoOAuthService.exchange`가 외부 카카오 연동을 담당한다.
     */
    @PostMapping("/oauth/kakao/exchange")
    public ApiResponse<KakaoExchangeResponse> kakaoExchange(@RequestBody KakaoExchangeRequest req) {
        return ApiResponse.success(kakaoOAuthService.exchange(req.getCode(), req.getRedirectUri()));
    }

    /**
     * 카카오 로그인 완료 후 토큰을 발급한다.
     * 기존 회원은 access token과 refresh cookie를 받고, 신규 회원은 가입 유도 정보를 응답받는다.
     * `KakaoOAuthService.login`이 가입 여부 판단과 쿠키 발급을 처리한다.
     */
    @PostMapping("/oauth/kakao/login")
    public ApiResponse<KakaoOauthLoginResponse> kakaoLogin(
            @RequestBody KakaoOauthLoginRequest req,
            HttpServletResponse response
    ) {
        return ApiResponse.success(kakaoOAuthService.login(req.getCode(), req.getRedirectUri(), response));
    }

    /**
     * 구글 로그인 완료 후 토큰을 발급한다.
     * 기존 회원은 access token과 refresh cookie를 받고, 신규 회원은 가입 유도 정보를 응답받는다.
     */
    @PostMapping("/oauth/google/login")
    public ApiResponse<GoogleOauthLoginResponse> googleLogin(
            @RequestBody GoogleOauthLoginRequest req,
            HttpServletResponse response
    ) {
        return ApiResponse.success(googleOAuthService.login(req.getCode(), req.getRedirectUri(), response));
    }

    /**
     * 네이버 로그인 완료 후 토큰을 발급한다.
     * 기존 회원은 access token과 refresh cookie를 받고, 신규 회원은 가입에 필요한 추가 정보를 응답받는다.
     */
    @PostMapping("/oauth/naver/login")
    public ApiResponse<NaverOauthLoginResponse> naverLogin(
            @RequestBody NaverOauthLoginRequest req,
            HttpServletResponse response
    ) {
        return ApiResponse.success(
                naverOAuthService.login(req.getCode(), req.getState(), req.getRedirectUri(), response)
        );
    }

    /**
     * 이메일/비밀번호 로그인을 처리한다.
     * 인증은 필요 없으며, 응답 본문에는 access token을 담고 refresh token은 HttpOnly 쿠키로 내려준다.
     * 실제 자격 증명 검증과 토큰 발급은 `AuthService.login`이 담당한다.
     */
    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@RequestBody LoginRequest req, HttpServletResponse response) {
        return ApiResponse.success(authService.login(req, response));
    }

    /**
     * 이메일과 휴대폰 번호가 모두 일치할 때 비밀번호 재설정 코드를 발급한다.
     * 인증은 필요 없으며, 응답은 코드 만료 시각을 담는다.
     * `PasswordResetService.requestPasswordReset`이 기존 토큰 무효화까지 수행한다.
     */
    @PostMapping("/password-reset/request")
    public ApiResponse<PasswordResetRequestResponse> requestPasswordReset(@RequestBody PasswordResetRequest req) {
        return ApiResponse.success(passwordResetService.requestPasswordReset(req));
    }

    /**
     * 비밀번호 재설정 코드를 선검증한다.
     * 인증은 필요 없으며, 성공 시 실제 비밀번호 변경 가능 상태만 확인한다.
     */
    @PostMapping("/password-reset/verify-code")
    public ApiResponse<MessageResponse> verifyPasswordResetCode(@RequestBody PasswordResetVerifyRequest req) {
        passwordResetService.verifyPasswordResetCode(req);
        return ApiResponse.success(new MessageResponse("PASSWORD_RESET_CODE_VERIFIED"));
    }

    /**
     * 검증된 재설정 코드로 비밀번호를 변경한다.
     * 성공하면 기존 refresh token을 모두 제거해 기존 세션을 강제 종료한다.
     */
    @PostMapping("/password-reset/confirm")
    public ApiResponse<MessageResponse> confirmPasswordReset(@RequestBody PasswordResetConfirmRequest req) {
        passwordResetService.confirmPasswordReset(req);
        return ApiResponse.success(new MessageResponse("PASSWORD_RESET_COMPLETED"));
    }

    /**
     * refresh cookie 기반으로 access token을 재발급한다.
     * 인증 헤더 대신 쿠키가 필요하며, refresh 성공 시 기존 refresh row를 지우고 새 쿠키로 교체한다.
     * `AuthService.refreshToken`이 rotation 정책을 적용한다.
     */
    @PostMapping("/refresh")
    public ApiResponse<TokenResponse> refreshToken(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = readCookieStrict(request, REFRESH_COOKIE_NAME);
        return ApiResponse.success(authService.refreshToken(refreshToken, response));
    }

    /**
     * 로그아웃을 멱등하게 처리한다.
     * refresh cookie가 없어도 200을 반환하고, 있으면 DB 토큰 삭제를 시도한 뒤 항상 쿠키를 만료시킨다.
     */
    @PostMapping("/logout")
    public ApiResponse<MessageResponse> logout(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = readCookieOptional(request, REFRESH_COOKIE_NAME);

        try {
            if (refreshToken != null && !refreshToken.isBlank()) {
                authService.logout(refreshToken, response);
            }
        } catch (Exception e) {
            // 서버 측 삭제가 실패해도 클라이언트 쿠키는 정리한다.
        } finally {
            expireRefreshCookie(response);
        }

        return ApiResponse.success(new MessageResponse("LOGOUT_OK"));
    }

    /**
     * refresh API처럼 쿠키가 반드시 필요한 흐름에서 사용한다.
     */
    private String readCookieStrict(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_MISSING);
        }
        for (Cookie c : cookies) {
            if (name.equals(c.getName())) return c.getValue();
        }
        throw new BusinessException(ErrorCode.REFRESH_TOKEN_MISSING);
    }

    /**
     * logout처럼 쿠키가 없어도 진행 가능한 흐름에서 사용한다.
     */
    private String readCookieOptional(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie c : cookies) {
            if (name.equals(c.getName())) return c.getValue();
        }
        return null;
    }

    /**
     * 발급 경로와 동일한 path로 refresh cookie를 강제 만료한다.
     */
    private void expireRefreshCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(RefreshCookieRequestSupport.shouldUseSecureAttribute(refreshCookieSecure))
                .sameSite("Lax")
                .path(refreshCookiePath)
                .maxAge(Duration.ZERO)
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
