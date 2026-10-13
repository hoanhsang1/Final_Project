package com.mems.identity.entity;

import com.mems.identity.enums.ModuleCode;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "module_config", uniqueConstraints = @UniqueConstraint(columnNames = {"org_id", "module"}))
@Getter
@Setter
@NoArgsConstructor
public class ModuleConfig {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id", nullable = false)
    private Organization organization;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ModuleCode module;

    @Column(nullable = false)
    private boolean enabled = false;

    @Column(name = "updated_by")
    private UUID updatedBy;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
