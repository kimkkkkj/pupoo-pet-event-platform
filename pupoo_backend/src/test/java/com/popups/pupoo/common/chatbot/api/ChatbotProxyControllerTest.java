package com.popups.pupoo.common.chatbot.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.popups.pupoo.ai.config.AiServiceProperties;
import com.popups.pupoo.common.api.ApiResponse;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ChatbotProxyControllerTest {

    private static final String INTERNAL_TOKEN = "internal-token-for-test";

    private final ObjectMapper objectMapper = new ObjectMapper();

    private HttpServer server;
    private String baseUrl;
    private volatile String lastPath;
    private volatile String lastAuthorization;
    private volatile String lastInternalToken;
    private volatile String lastBody;

    @BeforeEach
    void setUp() throws IOException {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/", exchange -> {
            lastPath = exchange.getRequestURI().getPath();
            lastAuthorization = exchange.getRequestHeaders().getFirst(HttpHeaders.AUTHORIZATION);
            lastInternalToken = exchange.getRequestHeaders().getFirst("X-Internal-Token");
            lastBody = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);

            byte[] responseBody = """
                    {"success":true,"code":"OK","data":{"message":"ok","messageType":"default","actions":[]}}
                    """.trim().getBytes(StandardCharsets.UTF_8);

            exchange.getResponseHeaders().add(HttpHeaders.CONTENT_TYPE, "application/json");
            exchange.sendResponseHeaders(200, responseBody.length);
            exchange.getResponseBody().write(responseBody);
            exchange.close();
        });
        server.start();
        baseUrl = "http://localhost:" + server.getAddress().getPort();
    }

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void userChatAlwaysForwardsToUserInternalRouteWithForcedUserRole() throws Exception {
        ChatbotProxyController controller = controller();

        ApiResponse<Map<String, Object>> body = controller.userChat(
                requestBodyWithRole("admin"),
                "Bearer user-jwt",
                new MockHttpServletRequest("POST", "/api/chatbot/chat")
        ).getBody();

        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isTrue();
        assertThat(lastPath).isEqualTo("/internal/chatbot/chat");
        assertThat(lastAuthorization).isEqualTo("Bearer user-jwt");
        assertThat(lastInternalToken).isEqualTo(INTERNAL_TOKEN);
        assertThat(jsonBody().at("/context/role").asText()).isEqualTo("user");
    }

    @Test
    void adminChatAlwaysForwardsToAdminInternalRouteWithForcedAdminRole() throws Exception {
        ChatbotProxyController controller = controller();

        ApiResponse<Map<String, Object>> body = controller.adminChat(
                requestBodyWithRole("user"),
                "Bearer admin-jwt",
                new MockHttpServletRequest("POST", "/api/admin/chatbot/chat")
        ).getBody();

        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isTrue();
        assertThat(lastPath).isEqualTo("/internal/admin/chatbot/chat");
        assertThat(lastAuthorization).isEqualTo("Bearer admin-jwt");
        assertThat(lastInternalToken).isEqualTo(INTERNAL_TOKEN);
        assertThat(jsonBody().at("/context/role").asText()).isEqualTo("admin");
    }

    private ChatbotProxyController controller() {
        AiServiceProperties properties = new AiServiceProperties();
        properties.setBaseUrl(baseUrl);
        properties.setInternalToken(INTERNAL_TOKEN);
        return new ChatbotProxyController(WebClient.builder(), properties, objectMapper);
    }

    private Map<String, Object> requestBodyWithRole(String role) {
        return Map.of(
                "message", "테스트 메시지",
                "history", List.of(),
                "context", Map.of(
                        "role", role,
                        "currentPage", "/"
                )
        );
    }

    private JsonNode jsonBody() throws IOException {
        return objectMapper.readTree(lastBody);
    }
}
