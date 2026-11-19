package com.mems.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Canonical role catalog rules shared by Identity and the platform console (AUTH-06). */
class RoleCatalogTest {

    @Test
    @DisplayName("normalize trims and upper-cases, null stays null")
    void normalizeTrimsAndUpperCases() {
        assertThat(RoleCatalog.normalize("  manager ")).isEqualTo("MANAGER");
        assertThat(RoleCatalog.normalize(null)).isNull();
    }

    @Test
    @DisplayName("OWNER and ORG_OWNER are the same owner class")
    void ownerAliasSharesOwnerClass() {
        assertThat(RoleCatalog.isOwner("owner")).isTrue();
        assertThat(RoleCatalog.isOwner("ORG_OWNER")).isTrue();
        assertThat(RoleCatalog.isOwner("MANAGER")).isFalse();
    }

    @Test
    @DisplayName("legacy roles are recognized but never platform-creatable")
    void legacyRolesAreReadOnly() {
        assertThat(RoleCatalog.isLegacy("ACADEMIC_STAFF")).isTrue();
        assertThat(RoleCatalog.LEGACY_ROLES)
            .allSatisfy(role -> assertThat(RoleCatalog.PLATFORM_CREATABLE).doesNotContain(role));
    }

    @Test
    @DisplayName("sameAccessClass only matches employee↔employee and self↔self")
    void sameAccessClassGroups() {
        assertThat(RoleCatalog.sameAccessClass("STAFF", "MANAGER")).isTrue();
        assertThat(RoleCatalog.sameAccessClass("STUDENT", "TEACHER")).isTrue();
        assertThat(RoleCatalog.sameAccessClass("STAFF", "STUDENT")).isFalse();
        assertThat(RoleCatalog.sameAccessClass("MANAGER", "OWNER")).isFalse();
    }

    @Test
    @DisplayName("required organization roles cover every runtime role plus the owner alias")
    void requiredRolesCoverRuntimeSet() {
        assertThat(RoleCatalog.REQUIRED_ORGANIZATION_ROLES)
            .contains("OWNER", "ORG_OWNER", "MANAGER", "STAFF", "STUDENT", "TEACHER");
        assertThat(RoleCatalog.PLATFORM_CREATABLE)
            .containsExactlyInAnyOrder("MANAGER", "STAFF", "STUDENT", "TEACHER");
    }
}
