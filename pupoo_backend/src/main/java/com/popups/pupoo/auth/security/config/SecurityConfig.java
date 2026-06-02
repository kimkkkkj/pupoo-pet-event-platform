// file: src/main/java/com/popups/pupoo/auth/security/config/SecurityConfig.java
package com.popups.pupoo.auth.security.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.popups.pupoo.auth.security.authentication.filter.JwtAuthenticationFilter;
import com.popups.pupoo.auth.security.handler.JwtAccessDeniedHandler;
import com.popups.pupoo.auth.security.handler.JwtAuthenticationEntryPoint;
import com.popups.pupoo.auth.token.JwtProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.security.servlet.PathRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;

@Configuration
public class SecurityConfig {

    private static final List<String> REQUIRED_CORS_ALLOWED_ORIGIN_PATTERNS = List.of(
        "https://pupoo.site",
        "https://www.pupoo.site"
    );

    private static final List<String> SPA_EXCLUDED_PREFIXES = List.of(
        "/api",
        "/internal",
        "/actuator",
        "/swagger-ui",
        "/v3/api-docs",
        "/uploads",
        "/static"
    );

    private final JwtProvider jwtProvider;
    private final ObjectMapper objectMapper;
    private final List<String> corsAllowedOriginPatterns;

    public SecurityConfig(
        JwtProvider jwtProvider,
        ObjectMapper objectMapper,
        @Value("${app.cors.allowed-origin-patterns}") String corsAllowedOriginPatterns
    ) {
        this.jwtProvider = jwtProvider;
        this.objectMapper = objectMapper;
        this.corsAllowedOriginPatterns = Stream.concat(
                REQUIRED_CORS_ALLOWED_ORIGIN_PATTERNS.stream(),
                Arrays.stream(corsAllowedOriginPatterns.split(","))
                    .map(String::trim)
                    .filter(pattern -> !pattern.isBlank())
            )
            .distinct()
            .toList();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(corsAllowedOriginPatterns);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Authorization", "Set-Cookie"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .httpBasic(basic -> basic.disable())
            .formLogin(form -> form.disable());

        http.exceptionHandling(ex -> ex
            .authenticationEntryPoint(new JwtAuthenticationEntryPoint())
            .accessDeniedHandler(new JwtAccessDeniedHandler())
        );

        http.authorizeHttpRequests(auth -> auth
            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
            .requestMatchers("/api/auth/**").permitAll()

            .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/auth/refresh").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/auth/logout").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/auth/password-reset/request").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/auth/password-reset/verify-code").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/auth/password-reset/confirm").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/auth/sms/send").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/auth/sms/verify").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/auth/signup/**").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/auth/oauth/**").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/auth/oauth/**").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/auth/email/verification/confirm").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/chatbot/chat").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/security/csp/report").permitAll()

            .requestMatchers(HttpMethod.GET, "/api/ping").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/health").permitAll()
            .requestMatchers(HttpMethod.GET, "/actuator/health", "/actuator/health/**").permitAll()
            .requestMatchers("/swagger-ui/**").permitAll()
            .requestMatchers("/v3/api-docs/**").permitAll()
            .requestMatchers("/error").permitAll()

            .requestMatchers(HttpMethod.GET, "/api/posts").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/posts/*").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/notices").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/notices/*").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/boards").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/faqs").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/faqs/*").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/events").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/events/*").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/events/closed/analytics").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/events/*/galleries").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/events/*/programs").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/events/*/booths").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/programs").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/programs/*").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/programs/*/speakers").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/programs/*/speakers/*").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/programs/*/votes/result").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/ai/**").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/analytics/events").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/analytics/events/*/congestion-by-hour").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/dashboard/realtime/events/*/congestions").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/realtime/events").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/realtime/events/**").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/program-applies/programs/*/candidates").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/speakers").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/speakers/*").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/booths").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/booths/*").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/qnas").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/qnas/*").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/galleries").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/galleries/*").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/reviews").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/reviews/*").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/replies").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/report-reasons").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/files/*").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/files/by-post/**").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/files/*/download").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/users/check-nickname").permitAll()
            .requestMatchers("/uploads/**").permitAll()
            .requestMatchers("/static/**").permitAll()
            .requestMatchers(PathRequest.toStaticResources().atCommonLocations()).permitAll()
            .requestMatchers(
                "/",
                "/index.html",
                "/assets/**",
                "/font/**",
                "/favicon.ico",
                "/logo_blue.png",
                "/logo_white.png",
                "/logo_gray.png",
                "/vite.svg"
            ).permitAll()

            // Admin console writes board content with admin token.
            .requestMatchers(HttpMethod.POST, "/api/posts").hasAnyRole("USER", "ADMIN", "SUPER_ADMIN")
            .requestMatchers(HttpMethod.PUT, "/api/posts/*").hasAnyRole("USER", "ADMIN", "SUPER_ADMIN")
            .requestMatchers(HttpMethod.DELETE, "/api/posts/*").hasAnyRole("USER", "ADMIN", "SUPER_ADMIN")
            .requestMatchers(HttpMethod.PATCH, "/api/posts/*/close").hasAnyRole("USER", "ADMIN", "SUPER_ADMIN")
            .requestMatchers(HttpMethod.POST, "/api/reviews").hasAnyRole("USER", "ADMIN", "SUPER_ADMIN")
            .requestMatchers(HttpMethod.PATCH, "/api/reviews/*").hasAnyRole("USER", "ADMIN", "SUPER_ADMIN")
            .requestMatchers(HttpMethod.DELETE, "/api/reviews/*").hasAnyRole("USER", "ADMIN", "SUPER_ADMIN")
            .requestMatchers(HttpMethod.POST, "/api/qnas").hasAnyRole("USER", "ADMIN", "SUPER_ADMIN")
            .requestMatchers(HttpMethod.PATCH, "/api/qnas/*").hasAnyRole("USER", "ADMIN", "SUPER_ADMIN")
            .requestMatchers(HttpMethod.DELETE, "/api/qnas/*").hasAnyRole("USER", "ADMIN", "SUPER_ADMIN")
            .requestMatchers(HttpMethod.POST, "/api/qnas/*/close").hasAnyRole("USER", "ADMIN", "SUPER_ADMIN")

            // Gallery write APIs require login.
            .requestMatchers(HttpMethod.POST, "/api/galleries/image/upload").hasAnyRole("USER", "ADMIN", "SUPER_ADMIN")
            .requestMatchers(HttpMethod.POST, "/api/galleries").hasAnyRole("USER", "ADMIN", "SUPER_ADMIN")
            .requestMatchers(HttpMethod.PATCH, "/api/galleries/*").hasAnyRole("USER", "ADMIN", "SUPER_ADMIN")
            .requestMatchers(HttpMethod.DELETE, "/api/galleries/*").hasAnyRole("USER", "ADMIN", "SUPER_ADMIN")

            .requestMatchers("/api/admin/**").hasAnyRole("ADMIN", "SUPER_ADMIN")
            .requestMatchers("/api/admin/chatbot/**").hasAnyRole("ADMIN", "SUPER_ADMIN")
            .requestMatchers("/internal/**").hasAnyRole("ADMIN", "SUPER_ADMIN")

            .requestMatchers("/api/users/me/**").hasAnyRole("USER", "SUPER_ADMIN")
            .requestMatchers("/api/payments/**").hasAnyRole("USER", "SUPER_ADMIN")
            .requestMatchers("/api/refunds/**").hasAnyRole("USER", "SUPER_ADMIN")
            .requestMatchers("/api/notifications/**").hasAnyRole("USER", "SUPER_ADMIN")
            .requestMatchers(HttpMethod.POST, "/api/event-registrations").hasAnyRole("USER", "SUPER_ADMIN")
            .requestMatchers(HttpMethod.DELETE, "/api/event-registrations/**").hasAnyRole("USER", "SUPER_ADMIN")
            .requestMatchers(HttpMethod.GET, "/api/users/me/event-registrations").hasAnyRole("USER", "SUPER_ADMIN")
            .requestMatchers(spaRouteMatcher()).permitAll()

            .anyRequest().hasAnyRole("USER", "ADMIN", "SUPER_ADMIN")
        );

        http.addFilterBefore(
            new JwtAuthenticationFilter(jwtProvider, objectMapper),
            UsernamePasswordAuthenticationFilter.class
        );

        return http.build();
    }

    private RequestMatcher spaRouteMatcher() {
        return request -> {
            if (!HttpMethod.GET.matches(request.getMethod())) {
                return false;
            }

            String uri = request.getRequestURI();
            if (uri == null || uri.isBlank()) {
                return false;
            }

            boolean excluded = SPA_EXCLUDED_PREFIXES.stream()
                .anyMatch(prefix -> uri.equals(prefix) || uri.startsWith(prefix + "/"));
            if (excluded) {
                return false;
            }

            return !uri.contains(".");
        };
    }
}
