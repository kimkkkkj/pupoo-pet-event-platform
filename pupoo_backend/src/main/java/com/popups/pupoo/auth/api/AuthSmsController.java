package com.popups.pupoo.auth.api;

import com.popups.pupoo.auth.application.SmsOtpService;
import com.popups.pupoo.auth.dto.SmsOtpSendRequest;
import com.popups.pupoo.auth.dto.SmsOtpVerifyRequest;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.api.MessageResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/sms")
public class AuthSmsController {

    private final SmsOtpService smsOtpService;

    public AuthSmsController(SmsOtpService smsOtpService) {
        this.smsOtpService = smsOtpService;
    }

    @PostMapping("/send")
    public ApiResponse<MessageResponse> sendOtp(@Valid @RequestBody SmsOtpSendRequest request) {
        smsOtpService.sendOtp(request);
        return ApiResponse.success(new MessageResponse("인증번호를 발송했습니다."));
    }

    @PostMapping("/verify")
    public ApiResponse<MessageResponse> verifyOtp(@Valid @RequestBody SmsOtpVerifyRequest request) {
        smsOtpService.verifyOtp(request);
        return ApiResponse.success(new MessageResponse("인증이 완료되었습니다."));
    }
}
