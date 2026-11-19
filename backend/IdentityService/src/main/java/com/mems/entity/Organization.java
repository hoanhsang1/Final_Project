package com.mems.entity;

import com.mems.entity.converter.OrgTypeConverter;
import com.mems.entity.converter.OrganizationStatusConverter;
import com.mems.entity.enums.OrgType;
import com.mems.entity.enums.OrganizationStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "organization")
@Getter
@Setter
public class Organization {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "name", nullable = false)
    private String name;

    @Convert(converter = OrgTypeConverter.class)
    @Column(name = "org_type", nullable = false)
    private OrgType orgType;

    @Convert(converter = OrganizationStatusConverter.class)
    @Column(name = "status", nullable = false)
    private OrganizationStatus status;
}
