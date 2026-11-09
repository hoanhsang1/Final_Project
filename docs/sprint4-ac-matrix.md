# Sprint 4 — Ma trận AC-15 → AC-19

Cột "Kiểm chứng" ghi test tự động (đường dẫn tương đối trong `backend/PeopleService/src/test/java/com/mems/`)
hoặc bước thử tay trong [`sprint4-manual-scenario.http`](sprint4-manual-scenario.http).

Toàn bộ test tự động: **PeopleService 80 test**, **IdentityService 2 test**, 0 failure (2026-11-06).

## AC-15 — Tạo hồ sơ giáo viên (FN-15)

| AC | Nội dung | Kiểm chứng | Trạng thái |
|---|---|---|---|
| 15.01 | Đủ trường bắt buộc: lưu được, hiện trong danh sách | `dto/TeacherRequestValidationTest#validRequestHasNoViolations`; `service/TeacherServiceTest#trimsTextAndNormalizesEmail`; tay bước 3–3b | Đạt |
| 15.02 | Thiếu mã/họ tên/liên hệ/chuyên môn: lỗi tại từng trường | `dto/TeacherRequestValidationTest#reportsEachRequiredField` | Đạt |
| 15.03 | Mã trùng trong tổ chức bị từ chối | `repository/StaffProfileRepositoryTest#detectsDuplicateStaffCodeWithinOrganization`; tay bước 3 (chạy lại) | Đạt |
| 15.04 | Email trùng trong tổ chức bị từ chối | `repository/StaffProfileRepositoryTest#detectsEmailRegardlessOfCaseAndExcludingSelf` | Đạt |
| 15.05 | Email/SĐT sai định dạng: lỗi tại trường | `dto/TeacherRequestValidationTest#rejectsMalformedEmailAndPhone` | Đạt |
| 15.06 | Chọn nhiều chuyên môn: lưu đủ | `dto/TeacherRequestValidationTest#requiresAtLeastOneSpecialty`; tay bước 3b | Đạt |
| 15.07 | Loại hợp đồng lưu được | `dto/TeacherRequestValidationTest#contractTypeIsOptionalWithFixedValues`; tay bước 3 | Đạt |
| 15.08 | Không nhận chuyên môn ngoài danh mục | `dto/TeacherRequestValidationTest#requiresAtLeastOneSpecialty` (mỗi phần tử không rỗng); service kiểm tra chuyên môn thuộc tổ chức | Đạt |
| 15.09 | Họ tên có dấu/ký tự đặc biệt lưu đúng; cắt khoảng trắng thừa | `service/TeacherServiceTest#trimsTextAndNormalizesEmail`; `dto/TeacherRequestValidationTest#rejectsOverlongFullName` | Đạt |
| 15.10 | 2 request tạo trùng nhanh: UNIQUE chặn hồ sơ thứ hai | `repository/StaffProfileRepositoryTest#uniqueConstraintBlocksSecondProfile` | Đạt |
| 15.11 | Không quyền: 403; phòng ban khác: 403 | `service/TeacherServiceTest#rejectsActorOutsideTeacherDepartment`; `security/PermissionEnforcementTest` | Đạt |
| 15.12 | Loại hợp đồng để trống vẫn lưu được | `dto/TeacherRequestValidationTest#contractTypeIsOptionalWithFixedValues` | Đạt |
| — | Chọn chức vụ không phải Giáo viên: không bắt trường giáo viên | `repository/TeacherRepositoryTest` (profile_type != TEACHER không tạo `teacher_profile`); seed/backfill ở `service/DefaultPositionSeederTest` | Đạt |

## AC-16 — Danh sách và tìm kiếm giáo viên (FN-16)

| AC | Nội dung | Kiểm chứng | Trạng thái |
|---|---|---|---|
| 16.01 | Danh sách đúng cột | `repository/TeacherRepositoryTest#filtersTeachers`; tay `GET /api/teachers` | Đạt |
| 16.02 | Tìm không dấu, không phân biệt hoa thường | `repository/TeacherRepositoryTest#filtersTeachers`; tay bước 15 (`GET /api/classes?q=demo`) | Đạt |
| 16.03 | Lọc theo chuyên môn | `repository/TeacherRepositoryTest#filtersTeachers` | Đạt |
| 16.04 | Lọc theo trạng thái dạy | `repository/TeacherRepositoryTest#filtersTeachers` | Đạt |
| 16.05 | Lọc kết hợp nhiều điều kiện | `repository/TeacherRepositoryTest#filtersTeachers` | Đạt |
| 16.06 | Giáo viên nhiều chuyên môn xuất hiện khi lọc bất kỳ chuyên môn nào | `repository/TeacherRepositoryTest#filtersTeachers` (dữ liệu seed nhiều chuyên môn) | Đạt |
| 16.07 | Phân trang biên đúng | `repository/TeacherRepositoryTest#paginationClampsPageAndSize` | Đạt |
| 16.08 | Từ khóa `%`, `_`, `'` không lỗi, không khớp toàn bộ | `repository/TeacherRepositoryTest#escapesWildcardCharacters` | Đạt |
| 16.09 | Chỉ dữ liệu tổ chức/phòng ban được phép | `repository/TeacherRepositoryTest#rejectsTeacherFromOtherOrganization`; `service/StudentClassManagementTest#crossOrganizationAccessReturns404` | Đạt |
| — | Chưa có lớp → nhãn "Chưa có lớp"; có lớp thì không | `repository/TeacherRepositoryTest#countsActiveClasses` | Đạt |

## AC-17 — Xem/sửa hồ sơ giáo viên (FN-17)

| AC | Nội dung | Kiểm chứng | Trạng thái |
|---|---|---|---|
| 17.01 | Xem đủ hồ sơ | `service/TeacherServiceTest#trimsTextAndNormalizesEmail`; tay bước 3b | Đạt |
| 17.02 | Xem lớp phụ trách | `repository/TeacherRepositoryTest#countsActiveClasses`; tay `GET /api/teachers/{id}` | Đạt |
| 17.03 | Sửa lưu được và có lịch sử | `service/TeacherServiceTest#confirmSavesSpecialtyChangeAndKeepsClasses` (audit `TEACHER_UPDATED`) | Đạt |
| 17.04 | Mã nhân sự không sửa được | `dto/TeacherUpdateRequest` không chứa `staffCode`; tay gửi thêm `staffCode` → bị bỏ qua | Đạt |
| 17.05 | Email trùng bị từ chối | `service/TeacherServiceTest#rejectsEmailUsedByAnotherTeacher` | Đạt |
| 17.06 | Giữ email cũ không báo trùng | `service/TeacherServiceTest#allowsKeepingOwnEmail` | Đạt |
| 17.07 | Đổi chuyên môn không đổi lớp phụ trách | `service/TeacherServiceTest#confirmSavesSpecialtyChangeAndKeepsClasses` | Đạt |
| 17.08 | Chuyên môn ngoài danh mục bị từ chối | `repository/TeacherRepositoryTest#specialtyNameIsNormalized` (chuẩn hóa tên) + kiểm tra org khi gắn | Đạt |
| 17.09 | Cảnh báo 409 `SPECIALTY_MISMATCH` nêu tên lớp; `confirm=true` mới lưu | `service/TeacherServiceTest#specialtyChangeWarnsWhenClassSubjectNoLongerMatches`; `#confirmSavesSpecialtyChangeAndKeepsClasses`; `repository/TeacherRepositoryTest#detectsSpecialtyMismatch` | Đạt |
| 17.10 | Hai người cùng sửa: người sau 409 `DATA_CHANGED` | `service/TeacherServiceTest#staleVersionReturnsDataChanged`; `repository/TeacherRepositoryTest#updateUsesOptimisticLock`; `repository/StaffProfileRepositoryTest#updateUsesOptimisticLock` | Đạt |

## AC-18 — Gán giáo viên cho lớp (FN-18)

| AC | Nội dung | Kiểm chứng | Trạng thái |
|---|---|---|---|
| 18.01 | Gán giáo viên DANG_DAY: chi tiết lớp hiện giáo viên | `service/ClassTeacherAssignmentTest#assignsActiveTeacher`; `repository/SchoolClassRepositoryTest#assignTeacherUpdatesTeacherAndVersion`; tay bước 5–6 | Đạt |
| 18.02 | `TAM_NGHI`/`NGHI_VIEC` không có trong danh sách chọn và bị từ chối khi gọi trực tiếp | `service/ClassTeacherAssignmentTest#rejectsNonTeachingTeacher`; `repository/TeacherRepositoryTest#assignableOnlyActiveTeachers` | Đạt |
| 18.03 | Luồng phê duyệt phân công của Epic 12 | **Chưa phủ — ngoài phạm vi Sprint 4** (chỉ kiểm tra cờ module) | Được phép |
| 18.05 | Module Phân công giáo viên bật: chặn kèm hướng dẫn | `service/ClassTeacherAssignmentTest#rejectsWhenAssignmentModuleIsActive` | Đạt |
| 18.06 | Module tắt/không tồn tại: gán bình thường | `service/ClassTeacherAssignmentTest#assignsActiveTeacher` (mặc định module không active) | Đạt |
| 18.07 | Lớp kết thúc/hủy/đã đóng không gán được | `service/ClassTeacherAssignmentTest#rejectsFinishedCancelledOrClosedClass`; `service/ClassLifecycleTest#closedClassIsReadOnly` | Đạt |
| 18.08 | Giáo viên tổ chức khác không chọn/gán được | `repository/TeacherRepositoryTest#rejectsTeacherFromOtherOrganization`; `service/ClassTeacherAssignmentTest` (requireTeacher theo org) | Đạt |
| 18.09 | Không quyền: 403 | `security/PermissionEnforcementTest`; `security/ClassLifecyclePermissionTest` | Đạt |
| — | Đổi giáo viên: người cũ hết "đang phụ trách", người không còn lớp quay lại "Chưa có lớp" | `repository/SchoolClassRepositoryTest#assignTeacherUpdatesTeacherAndVersion`; `repository/TeacherRepositoryTest#countsActiveClasses` | Đạt |
| — | Sai `version` khi gán: 409 | `service/ClassTeacherAssignmentTest#rejectsStaleVersion`; `repository/SchoolClassRepositoryTest#assignTeacherRejectsStaleVersion` | Đạt |
| — | Không có code kiểm tra trùng lịch | Rà soát mã nguồn: không có lời gọi ScheduleService/kiểm tra trùng lịch trong `SchoolClassService`/`ClassStatusService` | Đạt |

## AC-19 — Trạng thái lớp và đóng lớp (FN-19 + D9)

| AC | Nội dung | Kiểm chứng | Trạng thái |
|---|---|---|---|
| 19.01 | Đến ngày bắt đầu tự chuyển `DANG_DIEN_RA`, cả job và GET | `service/ClassLifecycleTest#automaticTransitionsAreIdempotent`; `#getTriggersRefresh` | Đạt |
| 19.02 | Quá ngày kết thúc tự chuyển `DA_KET_THUC`, cả job và GET | `service/ClassLifecycleTest#automaticTransitionsAreIdempotent` | Đạt |
| — | Chạy cập nhật tự động 2 lần: không nhật ký thừa | `service/ClassLifecycleTest#automaticTransitionsAreIdempotent` | Đạt |
| 19.04 | Hủy thiếu lý do: 400, không lưu | `service/ClassLifecycleTest#cancelRequiresReason` | Đạt |
| 19.05 | Hủy từ `CHUA_BAT_DAU` và `DANG_DIEN_RA` thành công | `service/ClassLifecycleTest#cancelsFromBothAllowedStatuses`; tay bước 8 | Đạt |
| 19.06 | Không chuyển ngược từ `DA_KET_THUC`/`DA_HUY` | `service/ClassLifecycleTest#rejectsCancelForFinishedOrCancelledClasses`; tay bước 8b | Đạt |
| 19.07 | Mỗi lần chuyển đúng 1 nhật ký đủ ai/khi nào/từ/sang/lý do | `service/ClassLifecycleTest#cancelsFromBothAllowedStatuses`; `#automaticTransitionsAreIdempotent` | Đạt |
| 19.08 | Gửi email khi đóng/mở lớp | **Chưa phủ — ngoài phạm vi Sprint 4** (email thuộc Epic khác) | Được phép |
| 19.09 | Hủy buổi học khi đóng lớp | **Chưa phủ — phụ thuộc Epic 6 (schedule/session)** | Được phép |
| 19.10 | `selectable=true` loại lớp kết thúc/hủy/đã đóng; danh sách thường vẫn thấy | `service/ClassLifecycleTest#selectableExcludesUnavailableClasses` | Đạt |
| 19.11 | Quyền sai: 403 | `security/ClassLifecyclePermissionTest#lifecycleEndpointsRequireTheirPermission`; tay bước 9b–9c | Đạt |
| 19.12/19.13 | Đổi cùng lúc: người sau 409 `STATUS_CHANGED`, không ghi đè | `service/ClassLifecycleTest#staleCancelDoesNotOverwrite`; `#updateRejectsStaleVersion` | Đạt |
| — | Đóng lớp: yêu cầu → PENDING; duyệt → CLOSED; từ chối cần lý do → NONE; mở lại → NONE; mỗi bước có sự kiện | `service/ClassLifecycleTest#closeApproveAndReopenWorkflow`; `#rejectCloseRequiresReason`; tay bước 9–13 | Đạt |
| — | Không duyệt khi chưa PENDING; không yêu cầu đóng lớp DA_HUY; người yêu cầu không tự duyệt | `service/ClassLifecycleTest#closeRulesAreEnforced`; `#requesterCannotApproveOwnRequest`; tay bước 9b | Đạt |
| — | Lớp CLOSED: chặn sửa/gán giáo viên, vẫn xem được | `service/ClassLifecycleTest#closedClassIsReadOnly` | Đạt |
| — | Không gửi email, không hủy buổi học | Rà soát mã nguồn: không có mail client/không gọi ScheduleService trong luồng đóng lớp | Đạt |

## Tổng hợp khoảng trống được phép

| AC | Lý do |
|---|---|
| AC-18.03 | Luồng phân công giáo viên thuộc Epic 12; Sprint 4 chỉ đọc cờ module và chặn gán trực tiếp. |
| AC-19.08, AC-19.09 | Email và buổi học/schedule thuộc Epic 6 và hạng mục ngoài Sprint 4 (plan ghi rõ "Không có đoạn code gửi email hay hủy buổi học"). |
