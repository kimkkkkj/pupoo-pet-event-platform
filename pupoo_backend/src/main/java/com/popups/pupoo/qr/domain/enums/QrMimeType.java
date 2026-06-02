// file: src/main/java/com/popups/pupoo/qr/domain/enums/QrMimeType.java
package com.popups.pupoo.qr.domain.enums;

import java.util.Arrays;

public enum QrMimeType {
    JPEG("jpeg"),
    JPG("jpg"),
    PNG("png"),
    GIF("gif"),
    WEBP("webp"),
    TIFF("tiff"),
    SVG("svg");

    private final String dbValue;

    QrMimeType(String dbValue) {
        this.dbValue = dbValue;
    }

    public String dbValue() {
        return dbValue;
    }

    public static QrMimeType fromDbValue(String v) {
        if (v == null) return null;

        return Arrays.stream(values())
                .filter(e -> e.dbValue.equalsIgnoreCase(v))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown mime_type: " + v));
    }
}