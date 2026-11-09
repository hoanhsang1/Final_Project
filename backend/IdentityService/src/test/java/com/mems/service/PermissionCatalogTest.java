package com.mems.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class PermissionCatalogTest {

    private static final List<String> SPRINT4_CODES = List.of(
        "CLASS_ASSIGN_TEACHER", "CLASS_CANCEL", "CLASS_CLOSE_REQUEST", "CLASS_CLOSE_APPROVE", "CLASS_REOPEN");

    @Test
    @DisplayName("5 quyền Sprint 4 có trong catalog và thuộc module STUDENT_MANAGEMENT")
    void sprint4PermissionsBelongToStudentManagement() {
        var byCode = PermissionCatalog.ENTRIES.stream()
            .collect(Collectors.toMap(PermissionCatalog.PermissionDefinition::code, p -> p));

        for (String code : SPRINT4_CODES) {
            assertThat(byCode).containsKey(code);
            assertThat(byCode.get(code).moduleCode()).isEqualTo("STUDENT_MANAGEMENT");
        }
    }

    @Test
    @DisplayName("Mã quyền trong catalog là duy nhất")
    void permissionCodesAreUnique() {
        Set<String> codes = PermissionCatalog.ENTRIES.stream()
            .map(PermissionCatalog.PermissionDefinition::code)
            .collect(Collectors.toSet());

        assertThat(codes).hasSize(PermissionCatalog.ENTRIES.size());
    }
}
