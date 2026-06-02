// file: src/main/java/com/popups/pupoo/notification/dto/NotificationListResponse.java
package com.popups.pupoo.notification.dto;

import lombok.Getter;

import java.util.List;

@Getter
public class NotificationListResponse {

    private final List<NotificationInboxResponse> items;

    private final int page;
    private final int size;
    private final long totalElements;
    private final int totalPages;

    private NotificationListResponse(List<NotificationInboxResponse> items,
                                    int page,
                                    int size,
                                    long totalElements,
                                    int totalPages) {
        this.items = items;
        this.page = page;
        this.size = size;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
    }

    public static NotificationListResponse of(List<NotificationInboxResponse> items,
                                             int page,
                                             int size,
                                             long totalElements,
                                             int totalPages) {
        return new NotificationListResponse(items, page, size, totalElements, totalPages);
    }
}
