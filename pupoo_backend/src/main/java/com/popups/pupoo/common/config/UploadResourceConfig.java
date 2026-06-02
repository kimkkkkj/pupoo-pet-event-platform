// file: src/main/java/com/popups/pupoo/common/config/UploadResourceConfig.java
package com.popups.pupoo.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * /uploads/** 경로로 정적 파일 서빙.
 *
 * SecurityConfig에서 /uploads/** → permitAll 이므로 인증 없이 접근 가능.
 * StaticResourceConfig(/static/**)와 별개로 동작하며 프로필 제한 없음.
 */
@Configuration
public class UploadResourceConfig implements WebMvcConfigurer {

    @Value("${storage.base-path:./uploads}")
    private String basePath;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        List<String> locations = resolveLocations();
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(locations.toArray(String[]::new));
    }

    private List<String> resolveLocations() {
        Set<String> locations = new LinkedHashSet<>();
        addIfExists(locations, Paths.get(basePath));
        addIfExists(locations, Paths.get("src", "main", "resources", "uploads"));
        addIfExists(locations, Paths.get("pupoo_backend", "src", "main", "resources", "uploads"));
        locations.add("classpath:/uploads/");
        return new ArrayList<>(locations);
    }

    private static void addIfExists(Set<String> locations, java.nio.file.Path path) {
        java.nio.file.Path absolute = path.toAbsolutePath().normalize();
        if (!Files.exists(absolute)) {
            return;
        }
        locations.add("file:" + absolute + "/");
    }
}
