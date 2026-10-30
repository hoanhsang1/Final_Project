# File thay đổi cho chức năng phân quyền phòng ban & module STUDENT_MANAGEMENT

Danh sách file trong đợt thực hiện:

## Cấu hình, migration và tài liệu

| Thao tác | File |
|---|---|
| Tạo | [10_identity_permission_module.sql](../10_identity_permission_module.sql) — Thêm cột module_code và seed 8 quyền sinh viên/lớp học |
| Tạo | [11_people_student_class.sql](../11_people_student_class.sql) — Bảng department_module, student, school_class, class_student |
| Sửa | [docs/department-access.md](../docs/department-access.md) |
| Sửa | [docs/department-access-files.md](../docs/department-access-files.md) |
| Sửa | [docs/department-access.http](../docs/department-access.http) |
| Sửa | [docs/docker-postman-guide.md](../docs/docker-postman-guide.md) |

## IdentityService

| Thao tác | File |
|---|---|
| Sửa | [backend/IdentityService/src/main/java/com/mems/service/PermissionCatalog.java](../backend/IdentityService/src/main/java/com/mems/service/PermissionCatalog.java) — Thêm trường moduleCode và 8 quyền mới |
| Sửa | [backend/IdentityService/src/main/java/com/mems/entity/Permission.java](../backend/IdentityService/src/main/java/com/mems/entity/Permission.java) — Thêm cột module_code |
| Sửa | [backend/IdentityService/src/main/java/com/mems/config/IdentityDataInitializer.java](../backend/IdentityService/src/main/java/com/mems/config/IdentityDataInitializer.java) — Seed 8 quyền mới và cập nhật module_code |
| Tạo | [backend/IdentityService/src/main/java/com/mems/controller/InternalOrganizationController.java](../backend/IdentityService/src/main/java/com/mems/controller/InternalOrganizationController.java) — GET /internal/orgs/{orgId}/modules |
| Sửa | [backend/IdentityService/src/test/resources/identity-test-schema.sql](../backend/IdentityService/src/test/resources/identity-test-schema.sql) |

## PeopleService

| Thao tác | File |
|---|---|
| Sửa | [backend/PeopleService/src/main/java/com/mems/dto/PermissionResponse.java](../backend/PeopleService/src/main/java/com/mems/dto/PermissionResponse.java) — Thêm moduleCode |
| Sửa | [backend/PeopleService/src/main/java/com/mems/client/IdentityClient.java](../backend/PeopleService/src/main/java/com/mems/client/IdentityClient.java) — Thêm activeModules(orgId) |
| Sửa | [backend/PeopleService/src/main/java/com/mems/dto/DepartmentRequest.java](../backend/PeopleService/src/main/java/com/mems/dto/DepartmentRequest.java) — Thêm moduleCodes |
| Sửa | [backend/PeopleService/src/main/java/com/mems/dto/DepartmentResponse.java](../backend/PeopleService/src/main/java/com/mems/dto/DepartmentResponse.java) — Thêm modules |
| Sửa | [backend/PeopleService/src/main/java/com/mems/repository/DepartmentRepository.java](../backend/PeopleService/src/main/java/com/mems/repository/DepartmentRepository.java) — Quản lý department_module |
| Sửa | [backend/PeopleService/src/main/java/com/mems/service/DepartmentService.java](../backend/PeopleService/src/main/java/com/mems/service/DepartmentService.java) — Validate module và ghi audit DEPARTMENT_MODULES_CHANGED |
| Sửa | [backend/PeopleService/src/main/java/com/mems/controller/DepartmentController.java](../backend/PeopleService/src/main/java/com/mems/controller/DepartmentController.java) — Thêm GET /departments/{id} |
| Tạo | [backend/PeopleService/src/main/java/com/mems/service/EffectivePermissionsService.java](../backend/PeopleService/src/main/java/com/mems/service/EffectivePermissionsService.java) — Tính quyền hiệu lực theo module phòng ban |
| Sửa | [backend/PeopleService/src/main/java/com/mems/repository/MemberRepository.java](../backend/PeopleService/src/main/java/com/mems/repository/MemberRepository.java) — Tích hợp EffectivePermissions |
| Sửa | [backend/PeopleService/src/main/java/com/mems/service/MembershipPolicy.java](../backend/PeopleService/src/main/java/com/mems/service/MembershipPolicy.java) — Kiểm tra PERMISSION_OUT_OF_MODULE |
| Tạo | [backend/PeopleService/src/main/java/com/mems/security/OrganizationModuleGuard.java](../backend/PeopleService/src/main/java/com/mems/security/OrganizationModuleGuard.java) — Chặn gọi API khi tổ chức thiếu active module |
| Sửa | [backend/PeopleService/src/main/java/com/mems/security/SecurityConfig.java](../backend/PeopleService/src/main/java/com/mems/security/SecurityConfig.java) — Thêm rule /students/** và /classes/** |
| Tạo | [backend/PeopleService/src/main/java/com/mems/dto/StudentRequest.java](../backend/PeopleService/src/main/java/com/mems/dto/StudentRequest.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/dto/StudentUpdateRequest.java](../backend/PeopleService/src/main/java/com/mems/dto/StudentUpdateRequest.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/dto/StudentResponse.java](../backend/PeopleService/src/main/java/com/mems/dto/StudentResponse.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/dto/SchoolClassRequest.java](../backend/PeopleService/src/main/java/com/mems/dto/SchoolClassRequest.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/dto/SchoolClassUpdateRequest.java](../backend/PeopleService/src/main/java/com/mems/dto/SchoolClassUpdateRequest.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/dto/SchoolClassResponse.java](../backend/PeopleService/src/main/java/com/mems/dto/SchoolClassResponse.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/repository/StudentRepository.java](../backend/PeopleService/src/main/java/com/mems/repository/StudentRepository.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/repository/SchoolClassRepository.java](../backend/PeopleService/src/main/java/com/mems/repository/SchoolClassRepository.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/service/StudentService.java](../backend/PeopleService/src/main/java/com/mems/service/StudentService.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/service/SchoolClassService.java](../backend/PeopleService/src/main/java/com/mems/service/SchoolClassService.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/controller/StudentController.java](../backend/PeopleService/src/main/java/com/mems/controller/StudentController.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/controller/SchoolClassController.java](../backend/PeopleService/src/main/java/com/mems/controller/SchoolClassController.java) |
| Sửa | [backend/PeopleService/src/test/resources/people-test-schema.sql](../backend/PeopleService/src/test/resources/people-test-schema.sql) |
| Tạo | [backend/PeopleService/src/test/java/com/mems/service/EffectivePermissionsServiceTest.java](../backend/PeopleService/src/test/java/com/mems/service/EffectivePermissionsServiceTest.java) |
| Tạo | [backend/PeopleService/src/test/java/com/mems/service/MembershipPolicyTest.java](../backend/PeopleService/src/test/java/com/mems/service/MembershipPolicyTest.java) |
| Tạo | [backend/PeopleService/src/test/java/com/mems/service/DepartmentModuleTest.java](../backend/PeopleService/src/test/java/com/mems/service/DepartmentModuleTest.java) |
| Tạo | [backend/PeopleService/src/test/java/com/mems/service/StudentClassManagementTest.java](../backend/PeopleService/src/test/java/com/mems/service/StudentClassManagementTest.java) |
