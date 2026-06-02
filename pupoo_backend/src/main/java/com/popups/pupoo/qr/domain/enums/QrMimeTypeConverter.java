// file: src/main/java/com/popups/pupoo/qr/domain/enums/QrMimeTypeConverter.java
package com.popups.pupoo.qr.domain.enums;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class QrMimeTypeConverter implements AttributeConverter<QrMimeType, String> {

    @Override
    public String convertToDatabaseColumn(QrMimeType attribute) {
        return attribute == null ? null : attribute.dbValue();
    }

    @Override
    public QrMimeType convertToEntityAttribute(String dbData) {
        return QrMimeType.fromDbValue(dbData);
    }
}