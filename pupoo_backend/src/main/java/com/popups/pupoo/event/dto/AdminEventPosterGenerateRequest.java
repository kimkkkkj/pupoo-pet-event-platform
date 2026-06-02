package com.popups.pupoo.event.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record AdminEventPosterGenerateRequest(
        @NotBlank(message = "eventName is required")
        @Size(max = 120, message = "eventName must be 120 characters or fewer")
        String eventName,

        @Size(max = 1000, message = "description must be 1000 characters or fewer")
        String description,

        @NotNull(message = "startAt is required")
        LocalDateTime startAt,

        @NotNull(message = "endAt is required")
        LocalDateTime endAt,

        @NotBlank(message = "location is required")
        @Size(max = 255, message = "location must be 255 characters or fewer")
        String location,

        @Size(max = 1000, message = "extraPrompt must be 1000 characters or fewer")
        String extraPrompt
) {}
