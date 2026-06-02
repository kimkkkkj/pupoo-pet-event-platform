package com.popups.pupoo.ai.dto;

import java.util.List;

public record AdminOrchestrationCapabilitiesResponse(
        SummaryCapability summary,
        NoticeCapability notices,
        NotificationCapability notifications,
        RefundCapability refunds,
        List<ActionCapability> actions
) {
    public AdminOrchestrationCapabilitiesResponse {
        actions = actions == null ? List.of() : List.copyOf(actions);
    }

    public record SummaryCapability(
            boolean supported,
            String path,
            String note
    ) {
        public SummaryCapability {
            path = path == null ? "" : path;
            note = note == null ? "" : note;
        }
    }

    public record NoticeCapability(
            boolean listSupported,
            boolean detailSupported,
            boolean createSupported,
            boolean updateSupported,
            boolean deleteSupported,
            boolean draftStatusSupported,
            boolean publishedStatusSupported,
            boolean hiddenStatusSupported,
            String listPath,
            String detailPath,
            String saveRule
    ) {
        public NoticeCapability {
            listPath = listPath == null ? "" : listPath;
            detailPath = detailPath == null ? "" : detailPath;
            saveRule = saveRule == null ? "" : saveRule;
        }
    }

    public record NotificationCapability(
            boolean draftCreateSupported,
            boolean draftUpdateSupported,
            boolean draftDeleteSupported,
            boolean sendNowSupported,
            boolean eventPublishSupported,
            boolean broadcastPublishSupported,
            boolean scheduleSupported,
            String draftPath,
            String sendPath,
            String unsupportedReason
    ) {
        public NotificationCapability {
            draftPath = draftPath == null ? "" : draftPath;
            sendPath = sendPath == null ? "" : sendPath;
            unsupportedReason = unsupportedReason == null ? "" : unsupportedReason;
        }
    }

    public record RefundCapability(
            boolean listSupported,
            boolean detailSupported,
            boolean approveSupported,
            boolean rejectSupported,
            boolean executeSupported,
            String listPath,
            String detailPath
    ) {
        public RefundCapability {
            listPath = listPath == null ? "" : listPath;
            detailPath = detailPath == null ? "" : detailPath;
        }
    }

    public record ActionCapability(
            String actionKey,
            boolean supported,
            String method,
            String path,
            String note
    ) {
        public ActionCapability {
            actionKey = actionKey == null ? "" : actionKey;
            method = method == null ? "" : method;
            path = path == null ? "" : path;
            note = note == null ? "" : note;
        }
    }
}
