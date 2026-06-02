// file: src/main/java/com/popups/pupoo/common/config/SchedulingConfig.java
package com.popups.pupoo.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 스케줄러 활성화 설정
 * - @Scheduled 기능을 사용하기 위해 필요
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
