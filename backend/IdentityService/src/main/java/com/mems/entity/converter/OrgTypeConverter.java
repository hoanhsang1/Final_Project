package com.mems.entity.converter;

import com.mems.entity.enums.OrgType;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Locale;

/**
 * The MySQL column is enum('school','center'); the Java enum is uppercase.
 */
@Converter
public class OrgTypeConverter implements AttributeConverter<OrgType, String> {

    @Override
    public String convertToDatabaseColumn(OrgType type) {
        return type == null ? null : type.name().toLowerCase(Locale.ROOT);
    }

    @Override
    public OrgType convertToEntityAttribute(String value) {
        return value == null || value.isBlank()
                ? null
                : OrgType.valueOf(value.trim().toUpperCase(Locale.ROOT));
    }
}
