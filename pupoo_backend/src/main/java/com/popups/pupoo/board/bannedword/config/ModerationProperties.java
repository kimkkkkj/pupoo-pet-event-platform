package com.popups.pupoo.board.bannedword.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "ai.moderation")
public class ModerationProperties {

    private String baseUrl = "http://pupoo-ai:80";
    private String internalToken = "";
    private int connectTimeoutMs = 3000;
    private int readTimeoutMs = 8000;
    private boolean enabled = true;
}
