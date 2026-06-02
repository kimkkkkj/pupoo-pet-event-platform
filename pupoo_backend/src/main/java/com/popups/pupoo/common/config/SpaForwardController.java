package com.popups.pupoo.common.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Controller
public class SpaForwardController {

    private static final List<String> EXCLUDED_PREFIXES = List.of(
        "/api",
        "/internal",
        "/actuator",
        "/swagger-ui",
        "/v3/api-docs",
        "/uploads",
        "/static"
    );

    @GetMapping(value = {"/", "/{path:[^\\.]*}", "/**/{path:[^\\.]*}"})
    public String forwardToIndex(HttpServletRequest request) {
        String uri = request.getRequestURI();
        boolean excluded = EXCLUDED_PREFIXES.stream()
            .anyMatch(prefix -> uri.equals(prefix) || uri.startsWith(prefix + "/"));

        if (excluded) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }

        return "forward:/index.html";
    }
}
