package com.popups.pupoo.common.security.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class CspReportService {

    private static final Logger log = LoggerFactory.getLogger(CspReportService.class);
    private static final int MAX_LOG_ENTRIES = 10;
    private static final int MAX_BODY_LENGTH = 1000;
    private static final int MAX_HEADER_LENGTH = 200;

    private final ObjectMapper objectMapper;

    public CspReportService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void accept(String contentType, String body, String userAgent, String referer, String remoteAddress) {
        List<CspViolationSummary> summaries = extractSummaries(body);
        if (summaries.isEmpty()) {
            log.warn(
                    "CSP report received but no structured violation could be parsed. contentType={} remote={} referrer={} userAgent={} body={}",
                    shorten(contentType, MAX_HEADER_LENGTH),
                    shorten(remoteAddress, MAX_HEADER_LENGTH),
                    shorten(referer, MAX_HEADER_LENGTH),
                    shorten(userAgent, MAX_HEADER_LENGTH),
                    shorten(body, MAX_BODY_LENGTH)
            );
            return;
        }

        for (int i = 0; i < Math.min(MAX_LOG_ENTRIES, summaries.size()); i++) {
            CspViolationSummary summary = summaries.get(i);
            log.warn(
                    "CSP report received. disposition={} directive={} blockedUri={} documentUri={} remote={} referrer={} userAgent={}",
                    shorten(summary.disposition(), MAX_HEADER_LENGTH),
                    shorten(summary.directive(), MAX_HEADER_LENGTH),
                    shorten(summary.blockedUri(), MAX_HEADER_LENGTH),
                    shorten(summary.documentUri(), MAX_HEADER_LENGTH),
                    shorten(remoteAddress, MAX_HEADER_LENGTH),
                    shorten(referer, MAX_HEADER_LENGTH),
                    shorten(userAgent, MAX_HEADER_LENGTH)
            );
        }
    }

    List<CspViolationSummary> extractSummaries(String body) {
        if (body == null || body.isBlank()) {
            return List.of();
        }

        try {
            JsonNode root = objectMapper.readTree(body);
            List<CspViolationSummary> summaries = new ArrayList<>();

            if (root == null || root.isNull()) {
                return List.of();
            }

            if (root.isArray()) {
                for (JsonNode entry : root) {
                    addSummaryIfPresent(summaries, entry);
                }
                return List.copyOf(summaries);
            }

            addSummaryIfPresent(summaries, root);
            return List.copyOf(summaries);
        } catch (Exception ex) {
            return List.of();
        }
    }

    private void addSummaryIfPresent(List<CspViolationSummary> summaries, JsonNode rawNode) {
        CspViolationSummary summary = toSummary(rawNode);
        if (summary != null) {
            summaries.add(summary);
        }
    }

    private CspViolationSummary toSummary(JsonNode rawNode) {
        if (rawNode == null || rawNode.isNull()) {
            return null;
        }

        JsonNode reportNode = unwrapReportNode(rawNode);
        if (reportNode == null || reportNode.isNull()) {
            return null;
        }

        String disposition = firstNonBlank(
                text(reportNode, "disposition"),
                text(rawNode, "type"),
                "report"
        );
        String directive = firstNonBlank(
                text(reportNode, "effective-directive"),
                text(reportNode, "effectiveDirective"),
                text(reportNode, "violated-directive"),
                text(reportNode, "violatedDirective")
        );
        String blockedUri = firstNonBlank(
                text(reportNode, "blocked-uri"),
                text(reportNode, "blockedURL"),
                text(reportNode, "blockedUrl")
        );
        String documentUri = firstNonBlank(
                text(reportNode, "document-uri"),
                text(reportNode, "documentURL"),
                text(reportNode, "documentUrl"),
                text(rawNode, "url")
        );

        if (directive == null && blockedUri == null && documentUri == null) {
            return null;
        }

        return new CspViolationSummary(disposition, directive, blockedUri, documentUri);
    }

    private JsonNode unwrapReportNode(JsonNode rawNode) {
        if (rawNode.has("csp-report")) {
            return rawNode.get("csp-report");
        }
        if (rawNode.has("body")) {
            return rawNode.get("body");
        }
        return rawNode;
    }

    private String text(JsonNode node, String fieldName) {
        if (node == null || node.isNull()) {
            return null;
        }

        JsonNode value = node.get(fieldName);
        if (value == null || value.isNull()) {
            return null;
        }

        String text = value.asText(null);
        return text == null || text.isBlank() ? null : text.trim();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    private String shorten(String value, int maxLength) {
        if (value == null || value.isBlank()) {
            return "-";
        }
        String trimmed = value.trim();
        if (trimmed.length() <= maxLength) {
            return trimmed;
        }
        return trimmed.substring(0, maxLength - 3) + "...";
    }
}
