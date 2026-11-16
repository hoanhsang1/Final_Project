package com.mems.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class PermissionCatalogTest {

    private static final List<String> LIFECYCLE_CODES = List.of(
        "class.assign_teacher", "class.cancel", "class.request_close", "class.approve_close", "class.reopen");

    @Test
    @DisplayName("Mã quyền vòng đời lớp có trong catalog, dạng chấm và thuộc module STUDENT_MANAGEMENT")
    void lifecyclePermissionsBelongToStudentManagement() {
        var byCode = PermissionCatalog.ENTRIES.stream()
            .collect(Collectors.toMap(PermissionCatalog.PermissionDefinition::code, p -> p));

        for (String code : LIFECYCLE_CODES) {
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

    @Test
    @DisplayName("Quyền nhân sự/lớp cho phép cả ORGANIZATION và DEPARTMENT; quyền ghi học sinh chỉ ORGANIZATION")
    void allowedScopesFollowResourceModel() {
        var byCode = PermissionCatalog.ENTRIES.stream()
            .collect(Collectors.toMap(PermissionCatalog.PermissionDefinition::code, p -> p));

        assertThat(byCode.get("employee.view").allowedScopes())
            .containsExactlyInAnyOrder("ORGANIZATION", "DEPARTMENT");
        // Trưởng phòng/HR phòng cần xem lớp trong phòng mình (PeopleService lọc dữ liệu).
        assertThat(byCode.get("class.view").allowedScopes())
            .containsExactlyInAnyOrder("ORGANIZATION", "DEPARTMENT");
        assertThat(byCode.get("class.reopen").allowedScopes())
            .containsExactlyInAnyOrder("ORGANIZATION", "DEPARTMENT");
        assertThat(byCode.get("student.create").allowedScopes()).containsExactly("ORGANIZATION");
        // Quyền tự phục vụ phải dùng được ở cả hai phạm vi.
        for (String code : List.of("student.self_view", "class.self_view", "schedule.self_view")) {
            assertThat(byCode.get(code).allowedScopes())
                .containsExactlyInAnyOrder("ORGANIZATION", "DEPARTMENT");
        }
    }

    @Test
    @DisplayName("Quyền lịch học/cơ sở vật chất gắn đúng module; quyền nhân sự không gắn module")
    void scheduleAndFacilityPermissionsAreModuleGated() {
        var byCode = PermissionCatalog.ENTRIES.stream()
            .collect(Collectors.toMap(PermissionCatalog.PermissionDefinition::code, p -> p));

        assertThat(byCode.get("schedule.view").moduleCode()).isEqualTo("SCHEDULE_MANAGEMENT");
        assertThat(byCode.get("facility.view").moduleCode()).isEqualTo("FACILITY_MANAGEMENT");
        assertThat(byCode.get("facility.manage").moduleCode()).isEqualTo("FACILITY_MANAGEMENT");
        assertThat(byCode.get("employee.view").moduleCode()).isNull();
        assertThat(byCode.get("position.manage").moduleCode()).isNull();
    }

    @Test
    @DisplayName("Có đúng 4 gói quyền và mỗi gói chỉ chứa mã có trong catalog")
    void bundlesReferenceCatalogCodes() {
        Set<String> codes = PermissionCatalog.ENTRIES.stream()
            .map(PermissionCatalog.PermissionDefinition::code)
            .collect(Collectors.toSet());

        assertThat(PermissionCatalog.BUNDLES).hasSize(4);
        for (PermissionCatalog.BundleDefinition bundle : PermissionCatalog.BUNDLES) {
            assertThat(bundle.permissions()).isNotEmpty();
            assertThat(codes).containsAll(bundle.permissions());
        }
        assertThat(PermissionCatalog.BUNDLES.stream().map(PermissionCatalog.BundleDefinition::code))
            .containsExactlyInAnyOrder("HR_MANAGEMENT", "ACADEMIC_MANAGEMENT",
                "SCHEDULE_MANAGEMENT", "FACILITY_MANAGEMENT");
    }

    @Test
    @DisplayName("ACADEMIC_MANAGEMENT bundle không chứa class.approve_close (kế hoạch v2 §0.3, DEC-02)")
    void academicBundleDoesNotContainApproveClose() {
        // F-02: Giáo vụ không được duyệt đóng lớp; sẽ được sửa ở BE-00.3.
        // Test này là regression guard: nếu ai đó vô tình thêm quyền này lại,
        // test sẽ fail và nhắc kiểm tra trước khi merge.
        PermissionCatalog.BundleDefinition academic = PermissionCatalog.BUNDLES.stream()
            .filter(b -> "ACADEMIC_MANAGEMENT".equals(b.code()))
            .findFirst()
            .orElseThrow();

        assertThat(academic.permissions()).doesNotContain("class.approve_close");

        // For now, record the known violation so the CI log is explicit:
        if (academic.permissions().contains("class.approve_close")) {
            System.err.println("[F-02 KNOWN VIOLATION] ACADEMIC_MANAGEMENT bundle still contains " +
                "class.approve_close. Fix in BE-00.3 migration.");
        }
    }
}
