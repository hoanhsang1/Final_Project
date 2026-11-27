# BÁO CÁO P10 — KIỂM THỬ TÍCH HỢP XẾP LỊCH TỰ ĐỘNG (DB LOCAL)

> Ngày chạy: 2026-11-27 · Nhánh: `feature/auto-schedule-integration-test` (tách từ `3732d53`)
> Phạm vi: **chỉ kiểm thử + báo cáo**, không thêm chức năng mới.
> Trạng thái git: **chưa commit, chưa push, chưa merge, chưa deploy**.

---

## 1. Môi trường & cách ly

| Hạng mục | Giá trị |
|---|---|
| DB | MySQL local `127.0.0.1:3306`, 4 schema riêng `mems_e2e_identity_db`, `mems_e2e_people_db`, `mems_e2e_schedule_db`, `mems_e2e_facility_db` |
| Cấu trúc schema | Clone từ DB live, sau đó chạy `docs/phase-1/e2e/e2e-schema-patch.sql` (bù các cột/bảng của migration 43–59) |
| Dữ liệu | `docs/phase-1/e2e/seed-e2e.sql`: 2 org E2E, 7 tài khoản, 4 GV, 95 HS, 10 lớp, 12 lớp-môn, 7 phòng, 6 ca, 5 buổi có sẵn |
| Service | Chạy native (không Docker): gateway 9080, identity 9081, people 9082, schedule 9083, facility 9084 |
| Eureka | Tắt 2 chiều (`--eureka.client.register-with-eureka=false --eureka.client.fetch-registry=false`) để **không đụng registry thật** |
| Secret | Đọc từ `.env` lúc chạy, không in ra log |
| Múi giờ | JVM `-Duser.timezone=Asia/Ho_Chi_Minh` + JDBC `serverTimezone=Asia/Ho_Chi_Minh` |

Script: `run-services.sh`, `stop-services.sh`, `run_scenarios.py` (đều trong `docs/phase-1/e2e/`).
Bằng chứng thô: `docs/phase-1/e2e/results/t-scenarios/*.json`, tổng hợp `results/scenario-summary.json`.

---

## 2. Kết quả T1–T14 (35/35 check PASS)

| Mã | Kịch bản | Kết quả | Bằng chứng |
|---|---|---|---|
| T1 | Nạp dữ liệu mẫu | PASS | 10 bảng đúng số lượng: org 2, account 7, teacher 4, student 95, class 10, class_subject 12, class_student 95, classroom 7, time_slot 6, session 5 |
| T2 | Lớp 3 môn, tạo nháp | PASS | 6 buổi, 0 xung đột, 0 unscheduled; Toan 2 / Van 2 / Ly 2 |
| T3 | Xác nhận nháp | PASS | confirm 200 created=6; DB 6 buổi; list theo lớp 6; `/schedules/me` GV1 2 buổi, HS 6 buổi |
| T4 | GV không đủ điều kiện 1 môn | PASS | Môn Anh unscheduled lý do "Không có giáo viên đủ điều kiện dạy môn Anh"; Toán vẫn xếp 2 buổi GV1 |
| T5 | Toàn bộ phòng máy bảo trì | PASS | Môn Tin unscheduled lý do "Không có phòng máy đủ 30 chỗ cho môn Tin" |
| T6 | Tạo tay buổi trùng nháp rồi xác nhận | PASS | confirm 409, created=0, failed lý do "Giáo viên đã có lịch trong khung giờ này"; lớp 10X **0 buổi** (rollback) |
| T7 | Tắt module `SCHEDULE_MANAGEMENT` | PASS* | Ghi bị chặn 400 `MODULE_NOT_ENABLED`, đọc vẫn 200; bật lại ghi 201 |
| T8 | Người không có quyền gọi API | PASS | 403 `FORBIDDEN` |
| T9 | Org khác dùng id lớp của org này | PASS | List `[]`; tạo nháp bằng id lớp lạ → 1 unscheduled "Lớp không tồn tại trong tổ chức"; list lịch org1 từ org2 `[]` |
| T10 | Nhập 07:30 | PASS | DB `2026-11-30 07:30:00`, API trả `2026-11-30T00:30:00Z` |
| T11 | Buổi lẻ chiếm ô mẫu của 10A ở 1 tuần | PASS | Nháp 10G+10Z: 6 buổi, **đúng 1 ngoại lệ** `ROOM_CHANGED` → R3, lý do "Đổi phòng sang R3 vì phòng đã có buổi của lớp …0007" |
| T12 | Sửa tay 1 buổi nháp rồi xác nhận | PASS | PATCH 200 (R5, 10:55 VN, manual=true); confirm created=1; DB GV4 / R5 / `2026-12-02 10:55:00` |
| T13a | Phòng thường kín → dùng phòng máy | PASS | Nháp môn ANY vào R6 (phòng máy) |
| T13b | Còn phòng thường → không dùng phòng máy | PASS | Nháp cùng điều kiện vào R2 (phòng thường), 0 ngoại lệ |
| T14 | Lớp đã đủ buổi kế hoạch | PASS | 0 items, 0 unscheduled |
| T4 (bổ sung) | Môn thiếu GV nhưng môn khác vẫn xếp | PASS | 10B: 2 items (Toán) + 1 unscheduled (Anh) |

\* **Sai lệch kỹ thuật của T7:** `SCHEDULE_MANAGEMENT` có `module.is_core=1` trong catalog nên Identity luôn trả về active dù `organization_module.status='disabled'` (SQL: `is_core=TRUE OR status='active'`). Để kiểm chứng cơ chế chặn ghi/cho đọc, test **tạm** đặt `is_core=0` + status disabled trong schema E2E, chạy xong **khôi phục cả hai**. DB live không bị đụng. Xem mục rủi ro R2.

---

## 3. DoD tổng (mục 7 kế hoạch) — 8/10 đạt

| # | Điều kiện | Trạng thái | Căn cứ |
|---|---|---|---|
| 1 | D1 chốt (hoặc ghi dùng mặc định); D8–D11 xác nhận | ☐ **Một phần** | D1 đã ghi "dùng mặc định" trong tài liệu + SQL canonical; **D8–D11 vẫn là [ĐỀ XUẤT]/[Cần bạn chọn]**, chưa có văn bản xác nhận của bạn |
| 2 | Môn có category + yêu cầu phòng; chuyên môn có category; một quy tắc D1 | ☑ | T2/T4/T5/T13; `TeacherEligibilityTest` 9, `SubjectCategoryRepositoryTest` 7, `TeacherEligibilityTest` (service) 9 |
| 3 | Bảng tiết / quy tắc lớp / giờ rảnh cấu hình qua API + giao diện | ☑ | `ScheduleConfigController` 6 endpoint; `schedule-config-page.tsx`; `ScheduleConfigServiceTest` 11; FE `schedule-config-page.test.tsx` |
| 4 | Phòng cấp org, đúng loại & sức chứa ở cả tay và tự động | ☑ | T5, T13a/b, T11; `ScheduleServiceRoomTest` 8; room filter `status='active' && brokenEquipmentCount=0` |
| 5 | Solver thuần, S1–S14 xanh; checker độc lập không thấy xung đột | ☑ | `AutoScheduleSolverTest` 16 test (S1–S14) PASS; `ScheduleConflictChecker` (test) đối chiếu; T2 `conflicts=[]` |
| 6 | Nháp → xem trước → xác nhận; kiểm lại từng buổi, không dữ liệu dở dang | ☑ | T2/T3/T6/T12; confirm 409 rollback `created=0`, T6 DB 0 buổi |
| 7 | `session.subject_id` có và dùng để đếm buổi | ☑ | Migration 58; T2 đếm theo môn; T14 `needed = planned − existing ≤ 0` → 0 yêu cầu |
| 8 | Giờ lưu/hiển thị đúng giờ Việt Nam | ☑ | T10 (07:30 VN ↔ 00:30Z), T12 (10:55 VN) |
| 9 | Quyền, module, `org_id` ở mọi endpoint mới | ☑ | T7/T8/T9; mọi truy vấn mới lọc `org_id` (rá soát `ScheduleDraftService`, `SchedulingRequirementBuilder`) |
| 10 | Bạn giải thích được thuật toán cho mentor (phụ lục A) | ☐ **Chưa kiểm** | Việc của bạn; phụ lục A kế hoạch đã có tóm tắt |

---

## 4. Test backend & build frontend

### Backend (`./mvnw -o -B test`, offline từng service)

| Service | Kết quả | Ghi chú |
|---|---|---|
| IdentityService | **78/78 PASS**, BUILD SUCCESS | gồm `PeopleAuthorizationClientTest` 5 |
| ScheduleService | **102/102 PASS**, BUILD SUCCESS | `AutoScheduleSolverTest` 16, `ScheduleRulesTest` 11, `ScheduleDraftServiceTest` 9, `ScheduleConfigServiceTest` 11, `SchedulingRequirementBuilderTest` 6, `ScheduleServiceRoomTest` 8 |
| FacilityService | **11/11 PASS**, BUILD SUCCESS | |
| APIGateway | **3/3 PASS**, BUILD SUCCESS | `RouteContractTest` |
| PeopleService | **389 test, 3 FAIL → BUILD FAILURE** | 3 lỗi **có sẵn từ trước**, ngoài phạm vi xếp lịch, **không sửa test**: `OutboxEventRepositoryTest.appendStoresPendingEvent`, `DelegationExpiryTest.marksOnlyOverdueActiveDelegations`, `DefaultPositionSeederTest.seedsDefaultsForNewOrganization` |

Log: `docs/phase-1/e2e/results/test-<Service>.log`.

### Frontend
- `npm test`: **34 file / 227 test PASS** (~184s).
- `npm run build` (`tsc -b && vite build`): **PASS**, 3244 module, `dist/assets/index-*.js` 1.12 MB (chỉ cảnh báo chunk > 900 kB, không phải lỗi).

---

## 5. File thay đổi

### 5.1 Chỉ thuộc P10 (mới trong lần này)

| File | Nội dung |
|---|---|
| `docs/phase-1/e2e/run-services.sh` | Chạy 5 service native; **tắt Eureka 2 chiều**; trim secret; mảng `COMMON` chống word-split |
| `docs/phase-1/e2e/stop-services.sh` | Dừng theo PID |
| `docs/phase-1/e2e/seed-e2e.sql` | Dữ liệu mẫu idempotent, id cố định, tên ASCII |
| `docs/phase-1/e2e/e2e-schema-patch.sql` | Bù cấu trúc thiếu của migration 43–59 trên schema E2E (cột NULL/default, `CREATE TABLE IF NOT EXISTS`) |
| `docs/phase-1/e2e/run_scenarios.py` | Chạy T1–T14, lưu bằng chứng JSON |
| `backend/IdentityService/.../client/PeopleAuthorizationClient.java` | **Sửa lỗi khởi động HEAD**: thêm `@Autowired` cho constructor chính (class có 2 constructor) |
| `backend/ScheduleService/.../scheduling/AutoScheduleSolver.java` | **Sửa lỗi khởi động HEAD**: thêm `@Component` (ScheduleDraftService inject bean này) |

### 5.2 Toàn bộ thay đổi đang mang trên nhánh (P1–P10, chưa commit)

| Khu vực | Số file | Nội dung chính |
|---|---|---|
| `backend/IdentityService` | 2 | `PermissionCatalog`, `PeopleAuthorizationClient` |
| `backend/PeopleService` | 36 | Subject/Specialty/Curriculum/ClassSubject/Teacher (category, eligibility, sessions/stage, apply curriculum, history), internal lookup, H2 schema, tests |
| `backend/ScheduleService` | 47 | ScheduleConfig, Draft flow, `schedule/` rules, `scheduling/` solver, `session.subject_id`, room type/capacity, H2 schema, tests |
| `backend/APIGateway` | 1 | Routes mới |
| `backend/FacilityService` | 0 | — |
| `frontend` | 27 | Màn xếp lịch nháp, cấu hình ca/quy tắc/giờ rảnh, môn-học/chuyên môn, mock adapter, nhãn lỗi |
| `docs` | 7 | `docs/phase-1/migrations/53,55–59`, `auto-schedule-setup-readme.md`, thư mục `e2e/` |

---

## 6. API mới/đã đổi (của cả đợt xếp lịch)

> P10 **không thêm API nào**. Danh sách dưới đây là các endpoint của đợt P8–P9 đã được kiểm chứng end-to-end.

**ScheduleService**
- `POST   /departments/{departmentId}/schedules/drafts` — tạo nháp (201)
- `GET    /departments/{departmentId}/schedules/drafts?status=` — danh sách nháp
- `GET    /departments/{departmentId}/schedules/drafts/{draftId}?week=` — chi tiết theo tuần
- `PATCH  /departments/{departmentId}/schedules/drafts/{draftId}/items/{itemId}` — sửa tay 1 buổi
- `POST   /departments/{departmentId}/schedules/drafts/{draftId}/confirm` — xác nhận (200 / **409 + failed[]**)
- `DELETE /departments/{departmentId}/schedules/drafts/{draftId}` — huỷ nháp
- `GET/PUT /schedule-config/time-slots`
- `GET/PUT /schedule-config/classes/{classId}/slot-rules`
- `GET/PUT /schedule-config/teachers/{teacherId}/availability`
- `POST   /departments/{departmentId}/schedules/auto-generate` — **@Deprecated**, giữ tạm cho client cũ

Quyền: đọc `schedule.view`, ghi `schedule.create`; module `SCHEDULE_MANAGEMENT`; mọi truy vấn lọc `org_id`.

**PeopleService** (phục vụ xếp lịch): category môn, `specialty.category_id`, danh sách GV đủ điều kiện (batch), lớp-môn có `sessions_per_week`/`stage_no`/`room_requirement`, áp curriculum, internal lookup buổi học.

---

## 7. Endpoint cũ / TODO còn lại

**Endpoint cũ vẫn tồn tại:**
- `POST /departments/{departmentId}/schedules/auto-generate`: backend `@Deprecated`, FE `schedulesApi.autoGenerate` + `useAutoSchedule` cũng `@deprecated` và **không màn hình nào gọi**. Có thể xoá ở P11.
- CRUD tay `/schedules` (GET/POST/PUT/cancel/DELETE) + `/schedules/room-suggestions`: **còn dùng thật** trong `schedule-page.tsx`, `classes-page.tsx` — không phải legacy.

**TODO/FIXME** (7, đều ở PeopleService, ngoài phạm vi xếp lịch):
`ClassApprovalPolicy`, `ClassSubjectService` (chặn xoá môn còn buổi), `EffectivePermissionsService` (uỷ quyền phạm vi), `GeneralManagerService`, `ResignationService`, `TeacherOffboardingHook`, `TransferService` (huỷ yêu cầu quá hạn). Không có TODO/FIXME mới ở Schedule/FE.

---

## 8. Rủi ro

| # | Rủi ro | Mức | Ghi chú |
|---|---|---|---|
| R1 | **DB live lệch HEAD**: migration 43–59 chưa chạy; thiếu `position.system_code`, cột scheduling của `class_subject`, `specialty_subject`, `class_subject_history`, bảng outbox/inbox/session_impact… | **Cao** | HEAD không boot được trên DB live; E2E chỉ chạy được nhờ clone + patch. Phải chạy migration trước khi deploy |
| R2 | `SCHEDULE_MANAGEMENT` là module **core** (`is_core=1`) nên không thể tắt theo tổ chức | Trung bình | T7 phải tạm đổi catalog; nếu nghiệp vụ cần tắt được thì phải quyết định đổi cờ core/ngữ nghĩa |
| R3 | Dữ liệu `session` cũ lưu theo UTC trước commit `1330b0e` sẽ hiển thị lệch 7 giờ | Trung bình | Cần script quy đổi nếu live có dữ liệu lịch cũ (chưa kiểm tra được do giới hạn truy cập DB) |
| R4 | Lỗi dấu tiếng Việt (`?`) khi import bằng client mặc định | Trung bình | Seed cố ý dùng ASCII; khi nạp thật phải `--default-character-set=utf8mb4` |
| R5 | Quy tắc D1 (category + ngoại lệ `APPROVED`) và D8–D11 chưa được bạn xác nhận chính thức | Trung bình | Ảnh hưởng DoD #1; code đang chạy theo mặc định đã ghi |
| R6 | Solver là heuristic (không tối ưu tuyệt đối); CP-SAT chưa làm | Thấp | S10 (50 lớp) đạt ngân sách thời gian |
| R7 | FE mới kiểm bằng build + unit test, **chưa thao tác trên trình duyệt** trong P10 | Thấp | Theo lựa chọn của bạn |
| R8 | PeopleService có 3 test đỏ sẵn → CI People đỏ | Thấp | Ngoài phạm vi, cần ticket riêng |
| R9 | Tài liệu DoD `KE_HOACH_XEP_LICH_TU_DONG.md` chỉ có ở commit `1330b0e` (nhánh `feature/auto-schedule-timezone`), **không có trên nhánh hiện tại** | Thấp | Cẩn thận khi merge để không mất tài liệu |

---

## 9. Việc còn lại

1. Bạn xác nhận D8–D11 (và D1) → đóng DoD #1.
2. Quyết định chính sách module `SCHEDULE_MANAGEMENT` (R2).
3. Lập kế hoạch chạy migration 43–59 trên DB live trước khi deploy (R1, R3).
4. P11: xoá endpoint `auto-generate` + code FE chết sau khi chốt không còn client cũ.
5. Ticket riêng cho 3 test đỏ PeopleService.
6. (Tuỳ chọn) kiểm thử trình duyệt màn nháp; nâng solver lên CP-SAT.
7. **Commit** khi bạn cho phép.

---

## 10. Cách chạy lại

```bash
cd docs/phase-1/e2e
./run-services.sh                  # 5 service native 9080–9084, Eureka tắt
python run_scenarios.py            # T1–T14, exit code = số check fail
./stop-services.sh
```
