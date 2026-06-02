// file: src/main/java/com/popups/pupoo/qr/persistence/projection/BoothVisitSummaryRow.java
package com.popups.pupoo.qr.persistence.projection;

import java.sql.Timestamp;

public interface BoothVisitSummaryRow {

    Long getEventId();
    String getEventName();

    Long getBoothId();
    String getPlaceName();
    String getZone();
    String getType();
    String getStatus();

    String getCompany();
    String getDescription();

    Integer getVisitCount();
    Timestamp getLastVisitedAt();
    String getLastCheckType();
}
