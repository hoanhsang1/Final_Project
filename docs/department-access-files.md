# File thay đổi cho chức năng phân quyền phòng ban

Danh sách file trong đợt thực hiện Bước 1–8. Xem nhật ký theo từng bước và cách gọi API tại [department-access.md](department-access.md). File frontend/vercel.json là thay đổi có sẵn của người dùng, không thuộc đợt này. Không chỉnh route hoặc auth của gateway.

## Cấu hình, migration và tài liệu

| Thao tác | File |
|---|---|
| Sửa | [.env.example](../.env.example) |
| Sửa | [.github/workflows/ci.yml](../.github/workflows/ci.yml) |
| Sửa | [README.md](../README.md) |
| Tạo | [06_identity_department_access.sql](../06_identity_department_access.sql) |
| Tạo | [07_people_department_access.sql](../07_people_department_access.sql) |
| Tạo | [08_facility_department_access.sql](../08_facility_department_access.sql) |
| Tạo | [09_schedule_department_access.sql](../09_schedule_department_access.sql) |
| Xóa | backend/pom.xml — mỗi service build bằng POM riêng |
| Sửa | [docker-compose.yml](../docker-compose.yml) |
| Tạo | [docs/department-access.http](../docs/department-access.http) |
| Tạo | [docs/department-access.md](../docs/department-access.md) |
| Tạo | [docs/docker-postman-guide.md](../docs/docker-postman-guide.md) |

## IdentityService

| Thao tác | File |
|---|---|
| Sửa | [backend/IdentityService/pom.xml](../backend/IdentityService/pom.xml) |
| Tạo | [backend/IdentityService/src/main/java/com/mems/client/PeopleAuthorizationClient.java](../backend/IdentityService/src/main/java/com/mems/client/PeopleAuthorizationClient.java) |
| Tạo | [backend/IdentityService/src/main/java/com/mems/config/CorsConfig.java](../backend/IdentityService/src/main/java/com/mems/config/CorsConfig.java) |
| Tạo | [backend/IdentityService/src/main/java/com/mems/config/IdentityDataInitializer.java](../backend/IdentityService/src/main/java/com/mems/config/IdentityDataInitializer.java) |
| Tạo | [backend/IdentityService/src/main/java/com/mems/config/OpenApiConfig.java](../backend/IdentityService/src/main/java/com/mems/config/OpenApiConfig.java) |
| Tạo | [backend/IdentityService/src/main/java/com/mems/controller/InternalAccountController.java](../backend/IdentityService/src/main/java/com/mems/controller/InternalAccountController.java) |
| Tạo | [backend/IdentityService/src/main/java/com/mems/controller/InternalPermissionController.java](../backend/IdentityService/src/main/java/com/mems/controller/InternalPermissionController.java) |
| Tạo | [backend/IdentityService/src/main/java/com/mems/controller/PasswordController.java](../backend/IdentityService/src/main/java/com/mems/controller/PasswordController.java) |
| Tạo | [backend/IdentityService/src/main/java/com/mems/dto/AccessProfile.java](../backend/IdentityService/src/main/java/com/mems/dto/AccessProfile.java) |
| Tạo | [backend/IdentityService/src/main/java/com/mems/dto/ApiError.java](../backend/IdentityService/src/main/java/com/mems/dto/ApiError.java) |
| Tạo | [backend/IdentityService/src/main/java/com/mems/dto/ChangePasswordRequest.java](../backend/IdentityService/src/main/java/com/mems/dto/ChangePasswordRequest.java) |
| Tạo | [backend/IdentityService/src/main/java/com/mems/dto/ProvisionAccountRequest.java](../backend/IdentityService/src/main/java/com/mems/dto/ProvisionAccountRequest.java) |
| Sửa | [backend/IdentityService/src/main/java/com/mems/entity/Account.java](../backend/IdentityService/src/main/java/com/mems/entity/Account.java) |
| Tạo | [backend/IdentityService/src/main/java/com/mems/entity/Permission.java](../backend/IdentityService/src/main/java/com/mems/entity/Permission.java) |
| Sửa | [backend/IdentityService/src/main/java/com/mems/entity/Role.java](../backend/IdentityService/src/main/java/com/mems/entity/Role.java) |
| Tạo | [backend/IdentityService/src/main/java/com/mems/security/InternalApiFilter.java](../backend/IdentityService/src/main/java/com/mems/security/InternalApiFilter.java) |
| Sửa | [backend/IdentityService/src/main/java/com/mems/security/JwtService.java](../backend/IdentityService/src/main/java/com/mems/security/JwtService.java) |
| Tạo | [backend/IdentityService/src/main/java/com/mems/security/PasswordChangeRequiredFilter.java](../backend/IdentityService/src/main/java/com/mems/security/PasswordChangeRequiredFilter.java) |
| Sửa | [backend/IdentityService/src/main/java/com/mems/security/SecurityConfig.java](../backend/IdentityService/src/main/java/com/mems/security/SecurityConfig.java) |
| Tạo | [backend/IdentityService/src/main/java/com/mems/service/AccessProfileService.java](../backend/IdentityService/src/main/java/com/mems/service/AccessProfileService.java) |
| Tạo | [backend/IdentityService/src/main/java/com/mems/service/AccountProvisioningService.java](../backend/IdentityService/src/main/java/com/mems/service/AccountProvisioningService.java) |
| Sửa | [backend/IdentityService/src/main/java/com/mems/service/AuthService.java](../backend/IdentityService/src/main/java/com/mems/service/AuthService.java) |
| Tạo | [backend/IdentityService/src/main/java/com/mems/service/PasswordChangeService.java](../backend/IdentityService/src/main/java/com/mems/service/PasswordChangeService.java) |
| Tạo | [backend/IdentityService/src/main/java/com/mems/service/PermissionCatalog.java](../backend/IdentityService/src/main/java/com/mems/service/PermissionCatalog.java) |
| Tạo | [backend/IdentityService/src/test/java/com/mems/identity/IdentityDepartmentAuthTests.java](../backend/IdentityService/src/test/java/com/mems/identity/IdentityDepartmentAuthTests.java) |
| Tạo | [backend/IdentityService/src/test/resources/application.properties](../backend/IdentityService/src/test/resources/application.properties) |
| Tạo | [backend/IdentityService/src/test/resources/identity-test-schema.sql](../backend/IdentityService/src/test/resources/identity-test-schema.sql) |

## PeopleService

| Thao tác | File |
|---|---|
| Sửa | [backend/PeopleService/pom.xml](../backend/PeopleService/pom.xml) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/client/IdentityClient.java](../backend/PeopleService/src/main/java/com/mems/client/IdentityClient.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/config/CorsConfig.java](../backend/PeopleService/src/main/java/com/mems/config/CorsConfig.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/config/OpenApiConfig.java](../backend/PeopleService/src/main/java/com/mems/config/OpenApiConfig.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/controller/DepartmentController.java](../backend/PeopleService/src/main/java/com/mems/controller/DepartmentController.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/controller/DepartmentMemberController.java](../backend/PeopleService/src/main/java/com/mems/controller/DepartmentMemberController.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/controller/InternalAuthorizationController.java](../backend/PeopleService/src/main/java/com/mems/controller/InternalAuthorizationController.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/controller/PositionController.java](../backend/PeopleService/src/main/java/com/mems/controller/PositionController.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/dto/ApiError.java](../backend/PeopleService/src/main/java/com/mems/dto/ApiError.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/dto/AuthorizationResponse.java](../backend/PeopleService/src/main/java/com/mems/dto/AuthorizationResponse.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/dto/CreatedMemberResponse.java](../backend/PeopleService/src/main/java/com/mems/dto/CreatedMemberResponse.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/dto/DepartmentRequest.java](../backend/PeopleService/src/main/java/com/mems/dto/DepartmentRequest.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/dto/DepartmentResponse.java](../backend/PeopleService/src/main/java/com/mems/dto/DepartmentResponse.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/dto/MemberPositionsRequest.java](../backend/PeopleService/src/main/java/com/mems/dto/MemberPositionsRequest.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/dto/MemberRequest.java](../backend/PeopleService/src/main/java/com/mems/dto/MemberRequest.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/dto/MemberResponse.java](../backend/PeopleService/src/main/java/com/mems/dto/MemberResponse.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/dto/PermissionResponse.java](../backend/PeopleService/src/main/java/com/mems/dto/PermissionResponse.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/dto/PositionRequest.java](../backend/PeopleService/src/main/java/com/mems/dto/PositionRequest.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/dto/PositionResponse.java](../backend/PeopleService/src/main/java/com/mems/dto/PositionResponse.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/exception/ApiException.java](../backend/PeopleService/src/main/java/com/mems/exception/ApiException.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/exception/GlobalExceptionHandler.java](../backend/PeopleService/src/main/java/com/mems/exception/GlobalExceptionHandler.java) |
| Sửa | [backend/PeopleService/src/main/java/com/mems/PeopleServiceApplication.java](../backend/PeopleService/src/main/java/com/mems/PeopleServiceApplication.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/repository/DepartmentRepository.java](../backend/PeopleService/src/main/java/com/mems/repository/DepartmentRepository.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/repository/MemberRepository.java](../backend/PeopleService/src/main/java/com/mems/repository/MemberRepository.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/repository/PositionRepository.java](../backend/PeopleService/src/main/java/com/mems/repository/PositionRepository.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/security/Actor.java](../backend/PeopleService/src/main/java/com/mems/security/Actor.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/security/InternalApiFilter.java](../backend/PeopleService/src/main/java/com/mems/security/InternalApiFilter.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/security/PasswordChangeRequiredFilter.java](../backend/PeopleService/src/main/java/com/mems/security/PasswordChangeRequiredFilter.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/security/SecurityConfig.java](../backend/PeopleService/src/main/java/com/mems/security/SecurityConfig.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/service/AccountCompensationService.java](../backend/PeopleService/src/main/java/com/mems/service/AccountCompensationService.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/service/DepartmentService.java](../backend/PeopleService/src/main/java/com/mems/service/DepartmentService.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/service/MemberService.java](../backend/PeopleService/src/main/java/com/mems/service/MemberService.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/service/MembershipPolicy.java](../backend/PeopleService/src/main/java/com/mems/service/MembershipPolicy.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/service/PeopleAuditService.java](../backend/PeopleService/src/main/java/com/mems/service/PeopleAuditService.java) |
| Tạo | [backend/PeopleService/src/main/java/com/mems/service/PositionService.java](../backend/PeopleService/src/main/java/com/mems/service/PositionService.java) |
| Sửa | [backend/PeopleService/src/main/resources/application.properties](../backend/PeopleService/src/main/resources/application.properties) |
| Tạo | [backend/PeopleService/src/test/java/com/mems/people/DepartmentAccessTests.java](../backend/PeopleService/src/test/java/com/mems/people/DepartmentAccessTests.java) |
| Tạo | [backend/PeopleService/src/test/resources/application.properties](../backend/PeopleService/src/test/resources/application.properties) |
| Tạo | [backend/PeopleService/src/test/resources/people-test-schema.sql](../backend/PeopleService/src/test/resources/people-test-schema.sql) |

## FacilityService

| Thao tác | File |
|---|---|
| Sửa | [backend/FacilityService/pom.xml](../backend/FacilityService/pom.xml) |
| Tạo | [backend/FacilityService/src/main/java/com/mems/config/CorsConfig.java](../backend/FacilityService/src/main/java/com/mems/config/CorsConfig.java) |
| Tạo | [backend/FacilityService/src/main/java/com/mems/config/OpenApiConfig.java](../backend/FacilityService/src/main/java/com/mems/config/OpenApiConfig.java) |
| Tạo | [backend/FacilityService/src/main/java/com/mems/controller/DepartmentFacilityController.java](../backend/FacilityService/src/main/java/com/mems/controller/DepartmentFacilityController.java) |
| Tạo | [backend/FacilityService/src/main/java/com/mems/dto/ApiError.java](../backend/FacilityService/src/main/java/com/mems/dto/ApiError.java) |
| Tạo | [backend/FacilityService/src/main/java/com/mems/dto/FacilityResponse.java](../backend/FacilityService/src/main/java/com/mems/dto/FacilityResponse.java) |
| Tạo | [backend/FacilityService/src/main/java/com/mems/exception/ApiException.java](../backend/FacilityService/src/main/java/com/mems/exception/ApiException.java) |
| Sửa | [backend/FacilityService/src/main/java/com/mems/exception/GlobalExceptionHandler.java](../backend/FacilityService/src/main/java/com/mems/exception/GlobalExceptionHandler.java) |
| Tạo | [backend/FacilityService/src/main/java/com/mems/security/Actor.java](../backend/FacilityService/src/main/java/com/mems/security/Actor.java) |
| Tạo | [backend/FacilityService/src/main/java/com/mems/security/PasswordChangeRequiredFilter.java](../backend/FacilityService/src/main/java/com/mems/security/PasswordChangeRequiredFilter.java) |
| Tạo | [backend/FacilityService/src/main/java/com/mems/security/SecurityConfig.java](../backend/FacilityService/src/main/java/com/mems/security/SecurityConfig.java) |
| Sửa | [backend/FacilityService/src/main/resources/application.properties](../backend/FacilityService/src/main/resources/application.properties) |
| Tạo | [backend/FacilityService/src/test/java/com/mems/facility/DepartmentScopeTests.java](../backend/FacilityService/src/test/java/com/mems/facility/DepartmentScopeTests.java) |
| Tạo | [backend/FacilityService/src/test/resources/application.properties](../backend/FacilityService/src/test/resources/application.properties) |
| Tạo | [backend/FacilityService/src/test/resources/facility-test-schema.sql](../backend/FacilityService/src/test/resources/facility-test-schema.sql) |

## ScheduleService

| Thao tác | File |
|---|---|
| Sửa | [backend/ScheduleService/pom.xml](../backend/ScheduleService/pom.xml) |
| Tạo | [backend/ScheduleService/src/main/java/com/mems/config/CorsConfig.java](../backend/ScheduleService/src/main/java/com/mems/config/CorsConfig.java) |
| Tạo | [backend/ScheduleService/src/main/java/com/mems/config/OpenApiConfig.java](../backend/ScheduleService/src/main/java/com/mems/config/OpenApiConfig.java) |
| Tạo | [backend/ScheduleService/src/main/java/com/mems/controller/DepartmentScheduleController.java](../backend/ScheduleService/src/main/java/com/mems/controller/DepartmentScheduleController.java) |
| Tạo | [backend/ScheduleService/src/main/java/com/mems/dto/ApiError.java](../backend/ScheduleService/src/main/java/com/mems/dto/ApiError.java) |
| Tạo | [backend/ScheduleService/src/main/java/com/mems/dto/ScheduleResponse.java](../backend/ScheduleService/src/main/java/com/mems/dto/ScheduleResponse.java) |
| Tạo | [backend/ScheduleService/src/main/java/com/mems/exception/ApiException.java](../backend/ScheduleService/src/main/java/com/mems/exception/ApiException.java) |
| Tạo | [backend/ScheduleService/src/main/java/com/mems/exception/GlobalExceptionHandler.java](../backend/ScheduleService/src/main/java/com/mems/exception/GlobalExceptionHandler.java) |
| Tạo | [backend/ScheduleService/src/main/java/com/mems/security/Actor.java](../backend/ScheduleService/src/main/java/com/mems/security/Actor.java) |
| Tạo | [backend/ScheduleService/src/main/java/com/mems/security/PasswordChangeRequiredFilter.java](../backend/ScheduleService/src/main/java/com/mems/security/PasswordChangeRequiredFilter.java) |
| Tạo | [backend/ScheduleService/src/main/java/com/mems/security/SecurityConfig.java](../backend/ScheduleService/src/main/java/com/mems/security/SecurityConfig.java) |
| Sửa | [backend/ScheduleService/src/main/resources/application.properties](../backend/ScheduleService/src/main/resources/application.properties) |
| Tạo | [backend/ScheduleService/src/test/java/com/mems/schedule/DepartmentScopeTests.java](../backend/ScheduleService/src/test/java/com/mems/schedule/DepartmentScopeTests.java) |
| Tạo | [backend/ScheduleService/src/test/resources/application.properties](../backend/ScheduleService/src/test/resources/application.properties) |
| Tạo | [backend/ScheduleService/src/test/resources/schedule-test-schema.sql](../backend/ScheduleService/src/test/resources/schedule-test-schema.sql) |

## Kiểm thử khởi động gateway và Eureka

| Thao tác | File |
|---|---|
| Tạo | [backend/APIGateway/src/test/resources/application.properties](../backend/APIGateway/src/test/resources/application.properties) |
| Tạo | [backend/EurekaServer/src/test/resources/application.properties](../backend/EurekaServer/src/test/resources/application.properties) |

Tạo thêm tài liệu này: docs/department-access-files.md. File .env thật không được đọc hoặc sửa; các secret cấu hình mới chỉ được khai báo trống trong .env.example.
