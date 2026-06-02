// file: src/main/java/com.popups.pupoo.common.dashboard.analytics/persistence/AdminAnalyticsQueryRepository.java
package com.popups.pupoo.common.dashboard.analytics.persistence;

import com.popups.pupoo.common.dashboard.analytics.dto.AdminCongestionByHourResponse;

import java.util.List;

public interface AdminAnalyticsQueryRepository {

    List<AdminCongestionByHourResponse> findAvgCongestionByHour(Long eventId);
}
