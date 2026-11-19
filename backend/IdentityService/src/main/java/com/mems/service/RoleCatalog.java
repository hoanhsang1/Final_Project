package com.mems.service;

import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Canonical role catalog (AUTH-06).
 *
 * <p>Role chỉ quyết định <em>nguồn quyền</em> lúc đăng nhập và lớp tài khoản,
 * không cấp quyền nghiệp vụ. Quyền nghiệp vụ do chức danh (PeopleService)
 * quyết định. Các role legacy được giữ để đọc dữ liệu cũ, không cấp mới.</p>
 */
public final class RoleCatalog {
    public static final String SUPER_ADMIN = "SUPER_ADMIN";
    public static final String OWNER = "OWNER";
    /** Alias tương thích của OWNER trong dữ liệu cũ. */
    public static final String OWNER_ALIAS = "ORG_OWNER";
    public static final String MANAGER = "MANAGER";
    public static final String STAFF = "STAFF";
    public static final String STUDENT = "STUDENT";
    /** Role tự phục vụ legacy; giáo viên mới là STAFF + position profile_type TEACHER. */
    public static final String TEACHER = "TEACHER";

    public static final List<String> REQUIRED_ORGANIZATION_ROLES =
        List.of(OWNER, OWNER_ALIAS, MANAGER, STAFF, STUDENT, TEACHER);

    public static final Set<String> OWNER_ROLES = Set.of(OWNER, OWNER_ALIAS);
    public static final Set<String> EMPLOYEE_ROLES = Set.of(MANAGER, STAFF);
    public static final Set<String> SELF_ROLES = Set.of(STUDENT, TEACHER);
    public static final Set<String> LEGACY_ROLES =
        Set.of("ORG_ADMIN", "ACADEMIC_STAFF", "FACILITY_STAFF");

    /**
     * Role được phép tạo/đổi qua AccountsPage. OWNER/ORG_OWNER đến từ đăng ký
     * tổ chức; role legacy không cấp mới.
     */
    public static final Set<String> PLATFORM_CREATABLE =
        Set.of(MANAGER, STAFF, STUDENT, TEACHER);

    private RoleCatalog() {}

    public static String normalize(String role) {
        return role == null ? null : role.trim().toUpperCase(Locale.ROOT);
    }

    public static boolean isOwner(String role) {
        String value = normalize(role);
        return value != null && OWNER_ROLES.contains(value);
    }

    public static boolean isLegacy(String role) {
        String value = normalize(role);
        return value != null && LEGACY_ROLES.contains(value);
    }

    /** Hai role cùng nguồn quyền (employee ↔ employee, self ↔ self). */
    public static boolean sameAccessClass(String left, String right) {
        String a = normalize(left);
        String b = normalize(right);
        if (a == null || b == null) return false;
        return EMPLOYEE_ROLES.contains(a) && EMPLOYEE_ROLES.contains(b)
            || SELF_ROLES.contains(a) && SELF_ROLES.contains(b);
    }
}
