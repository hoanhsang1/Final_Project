# MEMS — Phase 2: Đánh giá cuối (Final Review)

Ngày lập: 2026-11-20 · Nhánh `fixFlowCreateEmployee` · HEAD `fb054d4` · **Chưa commit / chưa deploy**

Tài liệu này là bản tự đánh giá trung thực: cái gì đã làm, cái gì cố ý chưa làm, cái gì còn
lệch giữa tài liệu thiết kế và code, và bằng chứng kiểm thử.

Tài liệu liên quan:

- [PHASE_2_CURRENT_ARCHITECTURE.md](PHASE_2_CURRENT_ARCHITECTURE.md) — hiện trạng trước khi sửa
- [PHASE_2_OUTBOX_DESIGN.md](PHASE_2_OUTBOX_DESIGN.md) — thiết kế outbox/inbox
- [PHASE_2_EVENT_CONTRACTS.md](../architecture/PHASE_2_EVENT_CONTRACTS.md) — hợp đồng event
- [PHASE_2_PROGRESS.md](PHASE_2_PROGRESS.md) — tiến độ & danh mục file

---

## 1. Kết luận điều hành

Phase 2 đã triển khai **đầy đủ phần kỹ thuật không phụ thuộc quyết định nghiệp vụ**:

- CC-03: transactional outbox ở People + Facility, publisher bền vững, HTTP relay nội bộ,
  inbox idempotent + chống event cũ ở Schedule. At-least-once, không hứa exactly-once.
- SCH-01 / CLS-03 / SCH-04: phát event và **chỉ đánh dấu** buổi bị ảnh hưởng; **không** tự
  sửa `session` hay xóa ghi danh vì chưa có quyết định nghiệp vụ.
- CC-06: API nhật ký tổ chức ở People, quyền `org.audit.view`, phân trang DB, che dữ liệu nhạy cảm,
  lỗi DB không bị nuốt. FE trang nhật ký **vẫn là placeholder** (đã ghi rõ).

Tất cả test chạy offline đều xanh; **chưa có** chạy DB thật, chưa chạy migration, chưa deploy.

---

## 2. Đối chiếu yêu cầu CC-03 (P0)

| # | Yêu cầu | Trạng thái | Bằng chứng |
|---|---|---|---|
| 1 | Ghi nghiệp vụ + outbox trong **cùng** transaction DB | Đạt | `OutboxEventRepository.append` gọi trong `@Transactional` của `SchoolClassService.assignTeacher`, `ClassStatusService.*`, `FacilityService.reportIssue/resolveIssue`; rollback nghiệp vụ kéo theo event |
| 2 | At-least-once, **không** exactly-once | Đạt | Publisher chỉ đánh `PUBLISHED` sau 2xx; lỗi/timeout → gửi lại; comment + code không hứa exactly-once |
| 3 | Bền vững, retry được sau restart | Đạt | Event nằm trong bảng `outbox_event`; `reclaimStale` thu hồi `PUBLISHING` quá hạn; không giữ trạng thái trong RAM |
| 4 | Consumer idempotent theo `event_id` | Đạt | `inbox_event` PK `(event_id, consumer_name)`; duplicate → 200 |
| 5 | Có version + thứ tự, bỏ event cũ | Đạt | `consumer_aggregate_state` + so `aggregateVersion`/`occurredAt`; test `staleVersionIsIgnored` |
| 6 | Cách ly tổ chức | Đạt | Envelope mang `organizationId`; consumer kiểm khớp payload; impact truy vấn có `class.org_id`; admin outbox/audit lấy org từ JWT |
| 7 | Không dùng `@Async`/queue in-memory làm cơ chế duy nhất | Đạt | `@Scheduled` + DB outbox; không có queue RAM |
| 8 | Không xóa event thất bại sau một lần | Đạt | Chỉ đổi `status='FAILED'`, giữ payload + `last_error` |
| 9 | Retry có giới hạn + backoff lũy tiến | Đạt | Tối đa 12 lần (cấu hình), `min(5s × 2^(n-1), 1h)` |
| 10 | Event lỗi truy vấn được | Đạt | `GET /outbox/events?status=FAILED&limit=&afterId=` |
| 11 | Replay thủ công có quyền + dấu vết | Đạt | `POST /outbox/events/{id}/replay`, chỉ `OWNER`, chỉ FAILED cùng org; ghi `replayed_at`, `replayed_by` |
| 12 | Không có broker vẫn chạy | Đạt | HTTP `POST /internal/events` với `X-Internal-Api-Key` |

Ghi chú trung thực:

- “Dấu vết kiểm toán” của replay nằm **trong chính bảng outbox** (`replayed_at/by`), **không**
  ghi vào `people_audit_log`. Đủ để truy vết ai replay khi nào; nếu muốn hiện trong nhật ký tổ chức
  thì cần bổ sung (đề xuất, chưa làm).
- `FAILED` không tự thử lại; phải replay tay — đúng thiết kế “bounded retry”.
- Outbox admin chưa có route Gateway/FE; hiện gọi trực tiếp service bằng JWT Owner.

---

## 3. Đối chiếu SCH-01, CLS-03, SCH-04

| Hạng mục | Yêu cầu | Trạng thái | Bằng chứng |
|---|---|---|---|
| SCH-01 | Nếu chưa có quyết định “tự thay giáo viên mọi buổi vs. cần xác nhận” → **không** bulk-update; được phép phát event + đánh dấu buổi bị ảnh hưởng | Đạt | `ClassTeacherChanged` phát khi giáo viên đổi; `ScheduleEventApplier` chỉ insert `session_impact`, **không** UPDATE `session.teacher_id`; test `teacherChangedMarksFutureSessionsOnly` xác nhận `teacher_id` giữ nguyên |
| SCH-01 | Không phát event thừa khi giáo viên không đổi | Đạt | `publishTeacherChanged` so `Objects.equals`; test `skipsEventWhenTeacherUnchanged` |
| CLS-03 | Hợp đồng + outbox + inbox + skeleton + idempotency | Đạt | `ClassStatusChanged` v1 từ mọi chuyển trạng thái; consumer xử lý + idempotent |
| CLS-03 | Không hủy buổi, không xóa ghi danh khi chưa có quyết định | Đạt | Applier chỉ OPEN/RESOLVE impact; test `classCancelledMarksThenReopenResolves` xác nhận `session` vẫn `scheduled` |
| SCH-04 | Facility phát `FacilityIncidentOpened/Resolved` | Đạt | `FacilityService.publishIncident` trong transaction; test 2 ca |
| SCH-04 | Schedule đánh dấu buổi tương lai bị ảnh hưởng, không tự đổi phòng/xóa | Đạt | Chỉ `session_impact`; test `incidentOpenedMarksFutureSessionsOfRoom` |
| SCH-04 | Thiết bị hỏng **không** đồng nghĩa phòng không dùng được | Đạt | Không đổi trạng thái phòng/buổi; impact chỉ là cảnh báo; sự cố không có `roomId` thì bỏ qua |
| SCH-04 | Resolve chỉ đóng impact còn đúng phòng | Đạt | `openIncidentImpactIds` lọc `session.room_id`; test `incidentResolvedKeepsImpactWhenRoomWasChanged` |

---

## 4. Đối chiếu CC-06 (P1)

| Yêu cầu | Trạng thái | Bằng chứng |
|---|---|---|
| API nhật ký tổ chức cho Owner | Đạt | `AuditLogController` `GET /audit-logs` |
| Quyền `org.audit.view` (thêm nếu thiếu) | Đạt | `PermissionCatalog` thêm `orgOnly("org.audit.view", ...)`; Owner tự có |
| `orgId` chỉ từ JWT | Đạt | `AuditLogService` dùng `actor.orgId()`, không nhận org từ query |
| Phân trang ở DB | Đạt | `COUNT(*)` + `LIMIT/OFFSET`; test `paginatesNewestFirst` |
| Che chi tiết nhạy cảm | Đạt | Che key chứa `password/token/secret/credential`, đệ quy object/array; details không parse được → `[unreadable]`; test `masksSensitiveFieldsRecursively`, `replacesUnreadableDetails` |
| Lỗi DB không trả danh sách rỗng | Đạt | Không bắt exception ở service; test `propagatesDatabaseErrors` (ném `DataAccessResourceFailureException`) |
| Nếu FE là placeholder thì chỉ làm API + ghi tài liệu | Đạt | `frontend/src/lib/nav.ts` vẫn `api-missing`; chưa sửa FE |

Bộ lọc hỗ trợ: `action`, `actorUserId`, `from`, `to` (ISO-8601). Sắp xếp mới nhất trước.
`page`/`size` được kẹp hợp lệ (page ≥ 1, 1 ≤ size ≤ 100).

---

## 5. Lệch giữa tài liệu thiết kế và code (đã sửa tài liệu)

1. **OUTBOX_DESIGN §7.3** từng ghi `409 → PUBLISHED` (coi như consumer đã có). Code thực tế và
   đúng ngữ nghĩa “BUSY” là **retry**: `409` nghĩa là consumer đang xử lý song song, chưa chắc
   đã xong. Đã sửa tài liệu thành `409 → retry` (khớp `OutboxPublisher.deliver`).
2. **EVENT_CONTRACTS §2.2** từng mô tả body `processed/duplicate/stale` riêng biệt. Triển khai
   trả `200 {"eventId","status":"PROCESSED"}` cho cả ba trường hợp (phân biệt nằm trong DB);
   `400` là `ApiResponse` `VALIDATION_ERROR`, `409` là `CONFLICT`, `500` lỗi nội bộ. Đã cập nhật
   tài liệu theo code.
3. **Schedule `session` không có `org_id`** → mọi truy vấn impact phải JOIN `class`.
   Tài liệu kiến trúc đã nêu; code làm đúng.
4. **Payload/details kiểu `LONGTEXT`** thay vì JSON của MySQL để tương thích H2 test — không ảnh
   hưởng MySQL thật.

---

## 6. Bằng chứng kiểm thử

| Bộ | Số test | Kết quả | Ghi chú |
|---|---:|---|---|
| IdentityService | 78 | Pass | Giữ nguyên + catalog hợp lệ |
| PeopleService | 319 | Pass | +outbox (12), +SCH-01 (2), +CC-06 (8) |
| ScheduleService | 19 | Pass | +consumer inbox/impact (9) |
| FacilityService | 9 | Pass | +event Opened/Resolved (2) |
| APIGateway | 3 | Pass | +route audit-logs |
| Frontend | 170 | Pass | Không đổi source Phase 2 |

Lệnh (offline theo từng service):

```bash
cd backend/IdentityService && ./mvnw -o test
cd backend/PeopleService && ./mvnw -o test
cd backend/ScheduleService && ./mvnw -o test
cd backend/FacilityService && ./mvnw -o test
cd backend/APIGateway && ./mvnw -o test
cd frontend && npx vitest run
```

Điều **chưa** kiểm chứng (trung thực):

- Chưa chạy E2E nhiều service thật (cần MySQL + service chạy). Test hiện tại là unit/`@JdbcTest`
  trên H2 MySQL-mode, kiểm đúng logic outbox/inbox/applier nhưng **không** kiểm mạng thật.
- Chưa chạy migration 48/49/50 trên DB thật (chỉ viết file).
- Chưa thử replay thủ công qua HTTP với JWT thật.

---

## 7. Rủi ro còn lại

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| HTTP relay không có broker → mất tạm thời nếu Schedule chết | Thấp | Outbox retry 12 lần + FAILED + replay tay; event không mất |
| `session_impact` tăng vô hạn | Thấp | Dòng RESOLVED giữ lịch sử; cần job lưu trữ sau này (chưa làm) |
| Outbox publisher chạy ở mọi instance nếu scale ngang | Thấp | `claim` bằng UPDATE có điều kiện đảm bảo 1 publisher thắng/event |
| Ai có `org.audit.view`? | Trung bình | Hiện chỉ Owner tự có; cấp thêm cần chốt Q19 và thêm vào bundle |
| FE nhật ký chưa nối | Thấp | Đã ghi rõ; API sẵn sàng |
| Không có UI replay event lỗi | Thấp | Gọi API trực tiếp; có thể thêm sau |

---

## 8. Điều kiện khi triển khai (không thực hiện trong đợt này)

1. Áp DDL: `48_people_outbox_event.sql` (mems_people_db), `49_facility_outbox_event.sql`
   (mems_facility_db), `50_schedule_inbox_impact.sql` (mems_schedule_db) **trước** khi deploy code.
2. Đặt `INTERNAL_API_KEY` khớp giữa People/Facility và Schedule.
3. Đặt `SCHEDULE_SERVICE_URL` cho People/Facility.
4. Khởi động Schedule trước để nhận event; publisher có delay đầu 15s.
5. Không đổi CORS/Vercel/URL backend trong đợt này.

---

## 9. Quyết định cần người dùng chốt

- **Q19:** Ngoài Owner, ai được xem nhật ký tổ chức? (quyết định `org.audit.view` có vào bundle nào)
- **Q20:** Đổi giáo viên lớp — tự thay mọi buổi tương lai hay cần xác nhận? (SCH-01)
- **Q21:** Đóng/hủy/kết thúc lớp — hủy buổi / giữ / xóa ghi danh thế nào? (CLS-03)
- **Q22:** Sự cố thiết bị/phòng — tự chuyển phòng, cảnh báo, hay hủy buổi? (SCH-04)

Chi tiết phương án: `MEMS_BUSINESS_DECISIONS_REQUIRED.md` (phụ lục Phase 2).

---

## 10. Trạng thái git

Toàn bộ thay đổi Phase 2 đang ở working tree, **chưa commit**. Danh sách tóm tắt:

- Mới: `backend/{People,Facility}Service/src/main/java/com/mems/outbox/**`,
  `backend/ScheduleService/src/main/java/com/mems/{inbox,service}` (event consumer/applier/impact),
  `backend/ScheduleService/src/main/java/com/mems/controller/InternalEventController.java`,
  `backend/ScheduleService/src/main/java/com/mems/security/InternalApiFilter.java`,
  `backend/PeopleService/.../{AuditLogRepository,AuditLogService,AuditLogController,AuditLogResponse}.java`,
  migration `48`, `49`, `50`, tài liệu Phase 2.
- Sửa: `SchoolClassService`, `ClassStatusService`, `ClassStatusRepository`, `FacilityService`,
  `FacilityServiceApplication`, ba `security/SecurityConfig`, `DepartmentScheduleController`,
  `PermissionCatalog`, `APIGateway/application.yml`, một số test + schema test.

Không có thay đổi nào ở `.env`, Vercel, CORS, URL backend, docker-compose hay tài khoản admin.
