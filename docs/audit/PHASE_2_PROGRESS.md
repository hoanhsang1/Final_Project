# MEMS — Phase 2: Tiến độ triển khai

Ngày lập: 2026-11-20 · Nhánh `fixFlowCreateEmployee` · HEAD `fb054d4` (thay đổi Phase 2 **chưa commit**)

Tài liệu này ghi **đúng trạng thái source hiện tại** sau khi triển khai Phase 2. Không commit,
không push, không deploy, không chạy migration trên môi trường thật.

Tham chiếu:

- Kiến trúc hiện tại (Stage 0): [PHASE_2_CURRENT_ARCHITECTURE.md](PHASE_2_CURRENT_ARCHITECTURE.md)
- Thiết kế outbox/inbox (Stage 1): [PHASE_2_OUTBOX_DESIGN.md](PHASE_2_OUTBOX_DESIGN.md)
- Hợp đồng sự kiện: [PHASE_2_EVENT_CONTRACTS.md](../architecture/PHASE_2_EVENT_CONTRACTS.md)

---

## 1. Trạng thái tổng thể

| Hạng mục | Mức | Trạng thái | Ghi chú ngắn |
|---|---|---|---|
| CC-03 — Transactional outbox + đồng bộ liên service | P0 | **HOÀN THÀNH (source + test)** | Outbox People/Facility, publisher `@Scheduled` + HTTP relay, inbox Schedule, retry/backoff, replay có quyền + dấu vết |
| SCH-01 — Đổi giáo viên lớp | P1 | **HOÀN THÀNH PHẦN CẦN THIẾT** | Phát `ClassTeacherChanged`; Schedule **chỉ đánh dấu** buổi bị ảnh hưởng, **không** tự đổi giáo viên |
| CLS-03 — Đóng/hủy/kết thúc lớp | P1 | **HOÀN THÀNH PHẦN CẦN THIẾT** | Phát `ClassStatusChanged`; Schedule đánh dấu/giải phóng impact, **không** hủy buổi, **không** xóa ghi danh |
| SCH-04 — Sự cố cơ sở vật chất | P1 | **HOÀN THÀNH PHẦN CẦN THIẾT** | Facility phát `FacilityIncidentOpened/Resolved`; Schedule đánh dấu/giải phóng impact, **không** tự đổi phòng |
| CC-06 — API nhật ký tổ chức | P1 | **HOÀN THÀNH (API)** | `GET /audit-logs` ở People, quyền `org.audit.view`, phân trang DB, che dữ liệu nhạy cảm; FE vẫn là placeholder |
| Migration 48/49/50 | — | **ĐÃ VIẾT FILE, CHƯA CHẠY** | Chỉ chạy local/test khi được duyệt |

Từ "HOÀN THÀNH PHẦN CẦN THIẾT" nghĩa là phần kỹ thuật **không phụ thuộc quyết định nghiệp vụ**
đã xong; các hành vi tự động thay đổi dữ liệu buổi học **cố ý không làm** (xem mục 6).

---

## 2. Phạm vi thay đổi theo service

### 2.1. PeopleService — producer outbox + audit API

| File | Loại | Trách nhiệm |
|---|---|---|
| `src/main/java/com/mems/outbox/OutboxEventTypes.java` | mới | Hằng tên event `ClassTeacherChanged`, `ClassStatusChanged` |
| `src/main/java/com/mems/outbox/OutboxEventRow.java` | mới | Record ánh xạ một dòng `outbox_event` |
| `src/main/java/com/mems/outbox/OutboxEventRepository.java` | mới | `append` (ghi PENDING), `findDue`, `claim` (UPDATE có điều kiện), `markPublished`, `reschedule`, `reclaimStale`, `replay`, `list` |
| `src/main/java/com/mems/outbox/EventRelayClient.java` | mới | `POST /internal/events` tới `SCHEDULE_SERVICE_URL`, header `X-Internal-Api-Key`, timeout 3s/5s |
| `src/main/java/com/mems/outbox/OutboxPublisher.java` | mới | `@Scheduled` gửi event đến hạn; 409/5xx/lỗi mạng → retry backoff; 4xx khác → FAILED; hết 12 lần → FAILED |
| `src/main/java/com/mems/outbox/OutboxAdminController.java` | mới | `GET /outbox/events`, `POST /outbox/events/{eventId}/replay` — chỉ `OWNER`, org từ JWT |
| `src/main/java/com/mems/service/SchoolClassService.java` | sửa | `assignTeacher` phát `ClassTeacherChanged` cùng transaction; bỏ qua nếu giáo viên không đổi |
| `src/main/java/com/mems/service/ClassStatusService.java` | sửa | Mọi thay đổi trạng thái/đóng/hủy/mở lại phát `ClassStatusChanged` cùng transaction |
| `src/main/java/com/mems/repository/ClassStatusRepository.java` | sửa | `TransitionRow` mang thêm `classCode` để event có mã lớp |
| `src/main/java/com/mems/repository/AuditLogRepository.java` | mới | Truy vấn `people_audit_log` theo org + bộ lọc, đếm và phân trang ở DB, join tên nhân sự |
| `src/main/java/com/mems/service/AuditLogService.java` | mới | Lấy org từ JWT, kẹp page/size, che `password/token/secret/credential` (kể cả lồng nhau) |
| `src/main/java/com/mems/controller/AuditLogController.java` | mới | `GET /audit-logs`; `@PreAuthorize("hasRole('OWNER') or hasAuthority('org.audit.view')")` |

### 2.2. FacilityService — producer outbox

| File | Loại | Trách nhiệm |
|---|---|---|
| `src/main/java/com/mems/outbox/*` | mới | Bản sao outbox của People (types, row, repository, relay, publisher, admin controller) |
| `src/main/java/com/mems/service/FacilityService.java` | sửa | `reportIssue` phát `FacilityIncidentOpened`, `resolveIssue` phát `FacilityIncidentResolved` trong cùng transaction |
| `src/main/java/com/mems/FacilityServiceApplication.java` | sửa | Thêm `@EnableScheduling` |
| `src/main/java/com/mems/security/SecurityConfig.java` | sửa | Cho `/outbox/**` đi qua xác thực JWT (phân quyền ở method level) |

Payload sự cố **không** chứa mô tả tự do, người báo, ảnh — chỉ `incidentId, equipmentId,
equipmentName, roomId, status, occurredAt|resolvedAt`.

### 2.3. ScheduleService — consumer inbox + impact

| File | Loại | Trách nhiệm |
|---|---|---|
| `src/main/java/com/mems/controller/InternalEventController.java` | mới | `POST /internal/events` cho publisher nội bộ |
| `src/main/java/com/mems/dto/EventEnvelope.java` | mới | Envelope nhận vào |
| `src/main/java/com/mems/dto/SessionImpactResponse.java` | mới | DTO buổi bị ảnh hưởng |
| `src/main/java/com/mems/security/InternalApiFilter.java` | mới | So khớp `X-Internal-Api-Key` constant-time, thiếu/sai → 401 |
| `src/main/java/com/mems/security/SecurityConfig.java` | sửa | `permitAll` cho `/internal/**` + gắn `InternalApiFilter` |
| `src/main/java/com/mems/inbox/InboxRepository.java` | mới | Chống trùng theo `(event_id, consumer_name)`; STARTED/RETRYING/ALREADY_PROCESSED/BUSY |
| `src/main/java/com/mems/inbox/ConsumerStateRepository.java` | mới | Version/occurredAt cuối cùng theo aggregate để bỏ event cũ |
| `src/main/java/com/mems/inbox/SessionImpactRepository.java` | mới | Tìm buổi tương lai theo lớp/phòng, ghi/giải phóng impact |
| `src/main/java/com/mems/service/ScheduleEventConsumer.java` | mới | Validate envelope (400), mở inbox, gọi applier, đánh FAILED khi lỗi |
| `src/main/java/com/mems/service/ScheduleEventApplier.java` | mới | `@Transactional`: chống stale → áp handler → upsert state → PROCESSED |
| `src/main/java/com/mems/service/SessionImpactService.java` | mới | Đọc danh sách impact theo phòng ban |
| `src/main/java/com/mems/controller/DepartmentScheduleController.java` | sửa | `GET /departments/{departmentId}/schedules/impacts?status=` |

Hành vi applier theo event (dữ liệu **không** bị sửa trên bảng `session`):

- `ClassTeacherChanged`: đánh dấu mọi buổi `scheduled` trong tương lai của lớp là bị ảnh hưởng.
- `ClassStatusChanged`: nếu lớp bị hủy/kết thúc/đóng → đánh dấu; ngược lại (mở lại) → giải phóng impact do chính event lớp mở.
- `FacilityIncidentOpened`: nếu có `roomId`, đánh dấu buổi tương lai dùng phòng đó (thiết bị hỏng ≠ phòng không dùng được).
- `FacilityIncidentResolved`: chỉ giải phóng impact nếu buổi vẫn ở đúng phòng lúc mở sự cố.

### 2.4. IdentityService — quyền mới

| File | Loại | Trách nhiệm |
|---|---|---|
| `src/main/java/com/mems/service/PermissionCatalog.java` | sửa | Thêm `org.audit.view` (chỉ ORGANIZATION, không gắn module) |
| `src/main/java/com/mems/config/IdentityDataInitializer.java` | không đổi | Tự seed quyền mới từ catalog khi khởi động (không cần migration) |

Owner/ORG_OWNER tự có mọi quyền trong catalog, nên có `org.audit.view` ngay. Quyền **không** nằm
trong bundle nào → muốn cấp cho chức danh khác phải thêm vào bundle (xem Q19).

### 2.5. APIGateway

| File | Loại | Trách nhiệm |
|---|---|---|
| `src/main/resources/application.yml` | sửa | Route `people-audit-logs-api`: `/api/audit-logs/**` → People, `StripPrefix=1` |
| `src/test/java/com/mems/RouteContractTest.java` | sửa | Bảo vệ route mới có `StripPrefix=1` |

Lưu ý: `GET /api/v1/audit-logs` (Identity, nền tảng) **không đổi**, vẫn chỉ `SUPER_ADMIN`.

---

## 3. Cơ chế outbox/publisher (đúng như code)

Trạng thái: `PENDING → PUBLISHING → PUBLISHED | FAILED`.

- `append` chạy **trong transaction nghiệp vụ** (`@Transactional` ở `assignTeacher`,
  `reportIssue`, `resolveIssue`, các hàm trạng thái lớp). Rollback nghiệp vụ ⇒ rollback event.
- Publisher mặc định: bật, chạy mỗi 5s sau delay đầu 15s, batch 50, tối đa 12 lần, khóa 60s.
  Tắt bằng `outbox.publisher.enabled=false` (test đã tắt).
- `claim` = `UPDATE ... WHERE event_id=? AND status='PENDING'` → 1 publisher thắng.
- Backoff: `min(5s × 2^(attempts-1), 1h)`; hết 12 lần → `FAILED` (không xóa event).
- `409` từ Schedule (đang xử lý song song) → **retry**; `4xx` khác → `FAILED`; `5xx`/timeout → retry.
- Publisher chết giữa chừng: `reclaimStale` đưa `PUBLISHING` quá hạn về `PENDING`.
- Replay: chỉ event `FAILED` **cùng tổ chức**; ghi `replayed_at`, `replayed_by`; chỉ `OWNER`.
- Truy vấn: `GET /outbox/events?status=FAILED&limit=&afterId=` (org từ JWT).

Consumer Schedule:

- `inbox_event` khóa chính `(event_id, consumer_name)`; `PROCESSED` → 200 idempotent;
  `PROCESSING` → 409; `FAILED` → thử lại.
- `consumer_aggregate_state` chặn event cũ hơn (`aggregateVersion <= lastVersion` hoặc
  `occurredAt` không mới hơn) — vẫn đánh dấu PROCESSED nhưng không áp dụng.
- `POST /internal/events` trả `200 {"eventId","status":"PROCESSED"}` cho xử lý mới/trùng/cũ;
  `400` khi envelope sai; `409` khi đang xử lý; `500` khi lỗi nội bộ (đã ghi FAILED để retry).

---

## 4. Migration (chỉ file, chưa chạy)

| File (root) | DB | Nội dung |
|---|---|---|
| `48_people_outbox_event.sql` | `mems_people_db` | `outbox_event` + UNIQUE event_id + index due + index org/created |
| `49_facility_outbox_event.sql` | `mems_facility_db` | `outbox_event` tương tự |
| `50_schedule_inbox_impact.sql` | `mems_schedule_db` | `inbox_event`, `consumer_aggregate_state`, `session_impact` |

Tất cả dùng `CREATE TABLE IF NOT EXISTS` (idempotent) và **không** sửa/xóa bảng cũ.
Thứ tự khi triển khai thật: chạy 48/49/50 **trước khi** deploy code mới (code ghi vào các bảng này).

> Trong repo hiện chưa có cơ chế tự chạy migration; các file này là DDL thủ công cho DBA.

---

## 5. Bằng chứng kiểm thử (chạy offline)

| Bộ | Lệnh | Kết quả |
|---|---|---|
| IdentityService | `cd backend/IdentityService && ./mvnw -o test` | **78** pass (gồm 6 test catalog) |
| PeopleService | `cd backend/PeopleService && ./mvnw -o test` | **319** pass |
| ScheduleService | `cd backend/ScheduleService && ./mvnw -o test` | **19** pass (9 consumer + 10 cũ) |
| FacilityService | `cd backend/FacilityService && ./mvnw -o test` | **9** pass |
| APIGateway | `cd backend/APIGateway && ./mvnw -o test` | **3** pass |
| Frontend | `cd frontend && npx vitest run` | **170** pass / 31 file |

Test Phase 2 tiêu biểu:

- People: `OutboxEventRepositoryTest` (6), `OutboxPublisherTest` (6), `ClassTeacherAssignmentTest`
  (+2 ca SCH-01), `AuditLogServiceTest` (8 ca CC-06).
- Schedule: `ScheduleEventConsumerTest` (9) — chỉ đánh dấu buổi tương lai, idempotent, bỏ version cũ,
  hủy lớp rồi mở lại, sự cố phòng rồi đổi phòng vẫn giữ impact, envelope sai bị 400.
- Facility: `FacilityServiceTest` (9) — phát Opened/Resolved, payload không chứa mô tả/người báo/ảnh.

Frontend không thay đổi trong Phase 2 (chỉ thêm quyền vào catalog); 170 test cũ vẫn xanh.

---

## 6. Việc cố ý chưa làm (chờ quyết định nghiệp vụ)

1. **SCH-01:** chưa có quyết định "đổi giáo viên lớp thì tự thay cho mọi buổi tương lai hay bắt
   trưởng bộ phận xác nhận" ⇒ **không** bulk-update `session.teacher_id`; chỉ đánh dấu impact.
2. **CLS-03:** chưa có quyết định xử lý buổi học và ghi danh khi lớp đóng/hủy ⇒ **không** hủy buổi,
   **không** xóa `class_student`/enrollment; chỉ đánh dấu/giải phóng impact.
3. **SCH-04:** thiết bị hỏng ≠ phòng không dùng được; chưa có quyết định tự đổi phòng ⇒ **không**
   đổi `session.room_id`, không xóa buổi.
4. **CC-06 frontend:** trang `/to-chuc/nhat-ky` vẫn là placeholder `api-missing`; chỉ API backend
   đã sẵn sàng (`GET /api/audit-logs`). Chưa nối FE vì Phase 2 yêu cầu backend + tài liệu.
5. **Outbox admin UI:** endpoint `/outbox/*` chỉ gọi trực tiếp service (chưa có route gateway/FE).
6. **Thông báo:** Schedule chưa có hệ thống notification; hiện chỉ có API đọc impact để người dùng
   thấy. Không gửi thông báo tự động.

Các câu hỏi tương ứng được ghi ở `MEMS_BUSINESS_DECISIONS_REQUIRED.md` (Q19–Q22).

---

## 7. Cách chạy local (khi được duyệt)

1. Chạy DDL 48/49/50 vào 3 database local/test tương ứng.
2. Đặt `INTERNAL_API_KEY` giống nhau giữa Publisher (People/Facility) và Schedule; đặt
   `SCHEDULE_SERVICE_URL` trỏ Schedule ở People/Facility.
3. Khởi động Schedule trước, rồi People/Facility (publisher delay đầu 15s).
4. Muốn xem event lỗi: `GET /outbox/events?status=FAILED` bằng JWT Owner.
5. Test tự động đã đặt `outbox.publisher.enabled=false` để không gọi mạng.

---

## 8. Giới hạn đã biết

- Kênh vận chuyển là **HTTP đồng bộ từ scheduler** (không phải broker). Chấp nhận được vì dự án
  không có broker; at-least-once được bảo đảm bởi outbox + retry, không phải bởi HTTP.
- Outbox chỉ tồn tại ở People và Facility (producer hiện có nhu cầu). Identity/People event khác
  (vd đổi tên nhân sự) **chưa** phát — ngoài phạm vi Phase 2.
- `session_impact` chỉ tăng, chưa có job lưu trữ/dọn dẹp; khi impact RESOLVED vẫn giữ dòng lịch sử.
- Audit API chỉ đọc `people_audit_log`; audit nền tảng của Identity vẫn tách riêng.
- Lỗi DB ở audit API trả 500 (không nuốt thành danh sách rỗng) — người dùng thấy lỗi thay vì
  tưởng "không có nhật ký".

---

## 9. Checklist đối chiếu yêu cầu (tóm tắt)

- [x] Ghi nghiệp vụ + outbox trong **cùng** transaction
- [x] At-least-once, bền vững, retry được; không mất event khi lỗi một lần
- [x] Inbox idempotent theo `event_id`
- [x] Có version + thứ tự, bỏ event cũ
- [x] Cách ly tổ chức (org từ JWT / envelope, kiểm trong mọi truy vấn)
- [x] Không dùng `@Async`/queue in-memory làm cơ chế duy nhất
- [x] Không xóa event thất bại; truy vấn được event FAILED
- [x] Retry có backoff lũy tiến; replay thủ công có quyền + dấu vết
- [x] SCH-01/CLS-03/SCH-04 không thay đổi nghiệp vụ chưa chốt
- [x] CC-06: quyền `org.audit.view`, org từ JWT, phân trang DB, che dữ liệu nhạy cảm, lỗi DB không trả rỗng
- [ ] FE trang nhật ký tổ chức (ngoài phạm vi backend Phase 2)
