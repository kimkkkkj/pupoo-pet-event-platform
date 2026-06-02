package com.popups.pupoo.common.security.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CspReportServiceTest {

    private final CspReportService cspReportService = new CspReportService(new ObjectMapper());

    @Test
    void extractsLegacyCspReportPayload() {
        String body = """
                {
                  "csp-report": {
                    "document-uri": "https://www.pupoo.site/auth/login",
                    "blocked-uri": "inline",
                    "effective-directive": "style-src-elem",
                    "disposition": "report"
                  }
                }
                """;

        List<CspViolationSummary> summaries = cspReportService.extractSummaries(body);

        assertThat(summaries).containsExactly(
                new CspViolationSummary(
                        "report",
                        "style-src-elem",
                        "inline",
                        "https://www.pupoo.site/auth/login"
                )
        );
    }

    @Test
    void extractsReportingApiPayload() {
        String body = """
                [
                  {
                    "type": "csp-violation",
                    "url": "https://www.pupoo.site/event/current",
                    "body": {
                      "blockedURL": "https://dapi.kakao.com/v2/maps/sdk.js",
                      "effectiveDirective": "script-src-elem",
                      "disposition": "report"
                    }
                  }
                ]
                """;

        List<CspViolationSummary> summaries = cspReportService.extractSummaries(body);

        assertThat(summaries).containsExactly(
                new CspViolationSummary(
                        "report",
                        "script-src-elem",
                        "https://dapi.kakao.com/v2/maps/sdk.js",
                        "https://www.pupoo.site/event/current"
                )
        );
    }
}
