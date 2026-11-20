package com.mems.entity.converter;

import com.mems.entity.enums.OrgType;
import com.mems.entity.enums.OrganizationStatus;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OrganizationConvertersTest {

    @Test
    void statusIsStoredLowercaseAndReadBackAsEnum() {
        OrganizationStatusConverter converter = new OrganizationStatusConverter();
        assertThat(converter.convertToDatabaseColumn(OrganizationStatus.PENDING)).isEqualTo("pending");
        assertThat(converter.convertToDatabaseColumn(OrganizationStatus.ACTIVE)).isEqualTo("active");
        assertThat(converter.convertToEntityAttribute("pending")).isEqualTo(OrganizationStatus.PENDING);
        assertThat(converter.convertToEntityAttribute("suspended")).isEqualTo(OrganizationStatus.SUSPENDED);
    }

    @Test
    void typeIsStoredLowercaseAndReadBackAsEnum() {
        OrgTypeConverter converter = new OrgTypeConverter();
        assertThat(converter.convertToDatabaseColumn(OrgType.SCHOOL)).isEqualTo("school");
        assertThat(converter.convertToDatabaseColumn(OrgType.CENTER)).isEqualTo("center");
        assertThat(converter.convertToEntityAttribute("school")).isEqualTo(OrgType.SCHOOL);
    }

    @Test
    void nullsStayNull() {
        assertThat(new OrganizationStatusConverter().convertToDatabaseColumn(null)).isNull();
        assertThat(new OrganizationStatusConverter().convertToEntityAttribute(null)).isNull();
        assertThat(new OrgTypeConverter().convertToDatabaseColumn(null)).isNull();
        assertThat(new OrgTypeConverter().convertToEntityAttribute("")).isNull();
    }
}
