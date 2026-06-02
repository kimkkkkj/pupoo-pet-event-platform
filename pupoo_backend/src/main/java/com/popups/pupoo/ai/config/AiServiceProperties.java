package com.popups.pupoo.ai.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "ai.service")
public class AiServiceProperties {

    private String baseUrl = "http://localhost:8000";
    private String internalToken = "";
    private long connectTimeoutMs = 2000L;
    private long responseTimeoutMs = 1500L;
    private long posterResponseTimeoutMs = 60000L;
    private long maxInMemorySizeBytes = 5L * 1024L * 1024L;

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getInternalToken() {
        return internalToken;
    }

    public void setInternalToken(String internalToken) {
        this.internalToken = internalToken;
    }

    public long getConnectTimeoutMs() {
        return connectTimeoutMs;
    }

    public void setConnectTimeoutMs(long connectTimeoutMs) {
        this.connectTimeoutMs = connectTimeoutMs;
    }

    public long getResponseTimeoutMs() {
        return responseTimeoutMs;
    }

    public void setResponseTimeoutMs(long responseTimeoutMs) {
        this.responseTimeoutMs = responseTimeoutMs;
    }

    public long getPosterResponseTimeoutMs() {
        return posterResponseTimeoutMs;
    }

    public void setPosterResponseTimeoutMs(long posterResponseTimeoutMs) {
        this.posterResponseTimeoutMs = posterResponseTimeoutMs;
    }

    public long getMaxInMemorySizeBytes() {
        return maxInMemorySizeBytes;
    }

    public void setMaxInMemorySizeBytes(long maxInMemorySizeBytes) {
        this.maxInMemorySizeBytes = maxInMemorySizeBytes;
    }
}
