package com.popups.pupoo.board.bannedword.config;

import io.netty.channel.ChannelOption;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

@Configuration
@EnableConfigurationProperties({ModerationProperties.class, OrchestrateProperties.class})
public class AiModerationConfig {

    @Bean(name = "aiModerationWebClient")
    public WebClient aiModerationWebClient(ModerationProperties properties) {
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, Math.max(500, properties.getConnectTimeoutMs()))
                .responseTimeout(Duration.ofMillis(Math.max(1000, properties.getReadTimeoutMs())));

        return WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .baseUrl(properties.getBaseUrl())
                .defaultHeader("X-Internal-Token", properties.getInternalToken())
                .build();
    }

    @Bean(name = "orchestrateWebClient")
    public WebClient orchestrateWebClient(OrchestrateProperties orchestrateProperties) {
        HttpClient httpClient = HttpClient.create()
                .responseTimeout(Duration.ofSeconds(Math.max(5, orchestrateProperties.getTimeoutSeconds())));
        return WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .build();
    }
}
