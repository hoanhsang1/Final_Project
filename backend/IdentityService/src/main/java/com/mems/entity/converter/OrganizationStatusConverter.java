package com.mems.entity.converter;

import com.mems.entity.enums.OrganizationStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Locale;

/**
 * The MySQL column is enum('pending','active','rejected','suspended'); the Java
 * enum is uppercase. Persist the lowercase label so INSERT/UPDATE are accepted.
 */
@Converter
public class OrganizationStatusConverter implements AttributeConverter<OrganizationStatus, String> {

    @Override
    public String convertToDatabaseColumn(OrganizationStatus status) {
        return status == null ? null : status.name().toLowerCase(Locale.ROOT);
    }

    @Override
    public OrganizationStatus convertToEntityAttribute(String value) {
        return value == null || value.isBlank()
                ? null
                : OrganizationStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
    }
}
