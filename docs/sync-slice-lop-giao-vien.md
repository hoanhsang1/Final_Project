# Sync slice: Lớp/Giáo viên (Hướng A)

> Nhánh: `chore/sync-main-class-flow`  
> Nguồn port: `origin/main` (chỉ lấy logic/hành vi/BE cần thiết, **không** port FE kiến trúc main)  
> Phạm vi: những gì FE Astryx hiện gọi trong `frontend/src/features/sprint4/sprint4Api.ts`

## 1. Mapping endpoint FE ↔ BE main ↔ HEAD

| FE call (`sprint4Api.ts`) | Main controller/endpoint | HEAD có? | Hành động |
|---|---|---:|---|
| `GET /api/teachers` | `TeacherController` `GET /teachers` | Không | Port |
| `GET /api/teachers/{userId}` | `GET /teachers/{staffId}` | Không | Port, kiểm tra id field (userId/staffId) |
| `POST /api/teachers` | `POST /teachers` | Không | Port |
| `PUT /api/teachers/{userId}` | `PUT /teachers/{staffId}` | Không | Port |
| `GET /api/teachers/assignable` | `GET /teachers/assignable` | Không | Port |
| `GET /positions` | `PositionController` (đã có ở HEAD, có diff M trên main) | Có | Đối chiếu diff main; chỉ port fix cần thiết |
| `GET /departments` | `DepartmentController` (đã có ở HEAD, có diff M trên main) | Có | Đối chiếu diff main; chỉ port fix cần thiết |
| `GET /api/specialties` | `SpecialtyController` `GET /specialties` | Không | Port |
| `POST /api/specialties` | `POST /specialties` | Không | Port |
| `GET /api/classes` | `SchoolClassController` `GET /classes` | Không | Port |
| `GET /api/classes/{classId}` | `GET /classes/{id}` | Không | Port |
| `PUT /api/classes/{classId}/teacher` | `PUT /classes/{id}/teacher` | Không | Port |
| `POST /api/classes/{classId}/cancel` | `POST /classes/{id}/cancel` | Không | Port |
| `POST /api/classes/{classId}/close-requests` | `POST /classes/{id}/close-requests` | Không | Port |
| `POST /api/classes/{classId}/close-requests/approve` | `POST /classes/{id}/close-requests/approve` | Không | Port |
| `POST /api/classes/{classId}/close-requests/reject` | `POST /classes/{id}/close-requests/reject` | Không | Port |
| `POST /api/classes/{classId}/reopen` | `POST /classes/{id}/reopen` | Không | Port |
| `GET /api/classes/{classId}/status-logs` | `GET /classes/{id}/status-logs` | Không | Port |
| `GET /api/classes/{classId}/close-events` | `GET /classes/{id}/close-events` | Không | Port |

## 2. Endpoint main có thêm (chưa thấy FE hiện gọi)

Teacher: `/me`, `/me/classes`, `/{staffId}/teaching-status`.  
SchoolClass: `POST /classes`, `PUT /classes/{id}`, `DELETE /classes/{id}`, `/me`, `/me/{id}/students`, `/{id}/teacher/reassign`, cancel approve/reject, students add/remove/list.  
Có thể cần sau; không port mù nếu FE chưa dùng.

## 3. Phụ thuộc có thể bị kéo theo

Port SchoolClass/Teacher/Specialty từ main có thể cần:
- DTO/entity/repository/service tương ứng trong `PeopleService`.
- Bảng DB/migration/schema (cần kiểm tra kỹ; `application.properties` có diff, chưa thấy migration file rõ trong diff resources).
- Client/gateway route/auth/module guard/permission.
- `ClassSubject/Subject/Curriculum` nếu service lớp/giáo viên phụ thuộc.

**Rủi ro:** main có delta lớn (Subject/Curriculum/ClassSubject/Student/Delegation/Approval...). Cần port tối thiểu, compile/test từng bước.

## 4. Thứ tự thực hiện đề xuất

1. **P2.1a** - ✅ Xong: `docs/sync-slice-lop-giao-vien-dependencies.md`.
2. **P2.1b** - ✅ Xong: port cây Java `origin/main` (Teacher/Specialty + toàn bộ dependency).
3. **P2.1c** - ✅ Xong: SchoolClass + lifecycle/close/status logs/events + outbox/module guard.
4. **P2.1d** - ✅ Xong: gateway `StripPrefix=1` cho 3 route `/api/...`; positioning/department đi theo bản main.
5. **P2.2** - ⏳ Chưa xác minh: thiếu JDK/Maven; chỉ mới kiểm tra tĩnh (0 import thiếu, endpoint khớp).
6. **P3.1** - ⏳ Chưa làm đúng thiết kế: chưa sửa FE Astryx; chờ contract runtime.

## 5. Ghi chú

- FE hiện tại dùng `/api/classes`, `/api/teachers`, `/api/specialties`; controller main dùng `/classes`, `/teachers`, `/specialties`. **Đã xử lý ở gateway**: thêm `StripPrefix=1` cho 3 route tương ứng trong `backend/APIGateway/src/main/resources/application.yml`. FE giữ nguyên.
- Không đụng ScheduleService/auto-schedule (P4 đang blocked theo `docs/scope-can-chot-xep-lich.md`).
- `db.sql` (từ main) chỉ là reference: có `DROP TABLE`/`INSERT`, **không chạy trực tiếp** lên DB đang dùng.
- Mọi điểm contract chưa chắc: ghi “Cần xác minh” (error response `ApiResponse`, outbox relay, schema runtime).