// file: src/main/java/com/popups/pupoo/notification/config/NotificationConfig.java
package com.popups.pupoo.notification.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(NotificationExternalProperties.class)
public class NotificationConfig {
}
