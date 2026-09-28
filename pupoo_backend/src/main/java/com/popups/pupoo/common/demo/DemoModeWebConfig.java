package com.popups.pupoo.common.demo;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * demo.mode=true 일 때만 데모 제한 인터셉터를 등록한다. (배포 데모 서버 전용, 로컬은 기본 꺼짐)
 */
@Configuration
@ConditionalOnProperty(name = "demo.mode", havingValue = "true")
public class DemoModeWebConfig implements WebMvcConfigurer {

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new DemoModeInterceptor())
                .addPathPatterns("/api/admin/**");
    }
}
