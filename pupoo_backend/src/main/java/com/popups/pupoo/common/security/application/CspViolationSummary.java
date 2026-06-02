package com.popups.pupoo.common.security.application;

public record CspViolationSummary(
        String disposition,
        String directive,
        String blockedUri,
        String documentUri
) {
}
