// file: src/main/java/com/popups/pupoo/common/config/StaticResourceConfig.java
package com.popups.pupoo.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * 개발(local/dev)에서만 사용: /static/** 를 로컬 파일시스템(basePath)으로 매핑한다.
 *
 *  현재(Windows/로컬)
 * - storage.base-path=./uploads (프로젝트 내부)
 * - 브라우저: http://3.38.233.224:8080/static/post/10/uuid.png
 *
 *  운영(우분투 + Nginx) 전환 시
 * - 이 클래스는 prod 프로필에서 로딩되지 않도록 유지
 * - Nginx가 /static/** 를 서빙하도록 설정 (alias)
 */
@Configuration
@Profile({"default", "local", "dev"})
public class StaticResourceConfig implements WebMvcConfigurer {

    @Value("${storage.base-path:./uploads}")
    private String basePath;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        List<String> locations = resolveLocations();
        registry.addResourceHandler("/static/**")
                .addResourceLocations(locations.toArray(String[]::new));

        /*
         * [운영 전환 시]
         * - prod 프로필에서는 이 설정이 적용되지 않게 유지한다.
         * - Nginx 예시:
         *   location /static/ { alias /var/app/uploads/; }
         */
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
