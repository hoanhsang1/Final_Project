# MEMS — Phase 2: Hợp đồng sự kiện (Event Contracts)

Ngày lập: 2026-11-20 · Nhánh `fixFlowCreateEmployee` · HEAD `fb054d4d0ebb704522465f9762cd1d41790d4c7d`

Tài liệu này là **hợp đồng giữa producer và consumer**. Tên event, tên trường và ngữ nghĩa
trong đây phải được dùng thống nhất; không tự đặt tên khác trong code.

Thiết kế tổng thể: [PHASE_2_OUTBOX_DESIGN.md](../audit/PHASE_2_OUTBOX_DESIGN.md).

---

## 1. Envelope thống nhất

Mọi event được bọc trong một envelope JSON:

```json
{
  "eventId": "0f6f0a3e-1c4e-4f3a-9a7e-1d2c3b4a5f60",
  "eventType": "ClassTeacherChanged",
  "eventVersion": 1,
  "organizationId": "11111111-1111-4111-8111-111111111111",
  "aggregateType": "CLASS",
  "aggregateId": "22222222-2222-4222-8222-222222222222",
  "aggregateVersion": 7,
  "occurredAt": "2026-11-20T03:15:00Z",
  "correlationId": "9b2d4c1e-8a7f-4e6d-b5c4-3a2f1e0d9c8b",
  "payload": {}
}
```

| Trường | Kiểu | Bắt buộc | Ý nghĩa |
|---|---|---|---|
| `eventId` | UUID string | Có | Duy nhất toàn hệ thống; khóa idempotency của consumer |
| `eventType` | string | Có | Tên trong catalog (mục 3); chỉ chữ cái, không dấu cách |
| `eventVersion` | int | Có | Phiên bản **schema** của event type; bắt đầu từ `1` |
| `organizationId` | UUID string | Có | Tổ chức sở hữu dữ liệu; consumer phải kiểm tra |
| `aggregateType` | string | Có | `CLASS` hoặc `FACILITY_INCIDENT` |
| `aggregateId` | UUID string | Có | ID lớp hoặc ID sự cố |
| `aggregateVersion` | long hoặc null | Không | `school_class.version` với event lớp; `null` với sự cố (bảng không có version) |
| `occurredAt` | ISO-8601 UTC | Có | Thời điểm nghiệp vụ xảy ra (không phải thời điểm gửi) |
| `correlationId` | UUID string hoặc null | Không | Truy vết một thao tác qua nhiều service |
| `payload` | object | Có | Dữ liệu tối thiểu, theo catalog |

Quy tắc:

- `eventId` sinh bằng `UUID.randomUUID()` **trước khi** insert outbox.
- `occurredAt` dùng `Instant.now()` tại thời điểm ghi nghiệp vụ, serialize dạng UTC (`Z`).
- Payload **không** chứa: mật khẩu, token, API key, secret, credential, mô tả tự do có thể chứa
  dữ liệu nhạy cảm, hay toàn bộ entity.
- Consumer bỏ qua mọi trường lạ trong payload (forward compatibility).

---

## 2. Kênh vận chuyển (HTTP relay nội bộ)

### 2.1. Endpoint

```http
POST /internal/events
Content-Type: application/json
X-Internal-Api-Key: <INTERNAL_API_KEY>
```

- Chỉ ScheduleService mở endpoint này.
- `SecurityConfig`: `requestMatchers("/internal/**").permitAll()` + `InternalApiFilter` (giống
  People/Facility). Không dùng JWT người dùng cho luồng này.
- Không nhận `organizationId` từ query string.

### 2.2. Ngữ nghĩa phản hồi

Triển khai hiện tại: thành công (dù xử lý mới, trùng hay cũ) đều trả `200` với body
`{"eventId": "...", "status": "PROCESSED"}`. Consumer phân biệt processed/duplicate/stale
**bên trong** (qua `inbox_event` và `consumer_aggregate_state`) nhưng publisher chỉ cần biết
“đã bàn giao và không cần gửi lại”.

| HTTP | Body | Khi nào | Publisher xử lý |
|---|---|---|---|
| `200` | `{"eventId","status":"PROCESSED"}` | Đã xử lý mới, trùng (đã `PROCESSED`) hoặc cũ hơn (stale) | `PUBLISHED` |
| `400` | `ApiResponse` lỗi `VALIDATION_ERROR` | Payload sai, `eventType` lạ, `eventVersion` không hỗ trợ, org không khớp | `FAILED` (không retry vô ích) |
| `409` | `ApiResponse` lỗi `CONFLICT` | Cùng event đang được xử lý song song | Retry sau (backoff) |
| `500` | `ApiResponse` lỗi nội bộ | Lỗi xử lý nội bộ | Retry có backoff |

- `200` nghĩa là “đã nhận và đã xử lý/bỏ qua hợp lệ”, không phải “đã áp dụng thay đổi nghiệp vụ”.
- Trả `400` không được làm consumer ghi dữ liệu một phần: kiểm tra hợp lệ **trước** transaction.

### 2.3. Bảo mật

- `X-Internal-Api-Key` so sánh constant-time; thiếu/sai → `401`.
- Chỉ chấp nhận `POST`; `GET/PUT/DELETE` trên `/internal/events**` bị từ chối.
- Không log toàn bộ payload ở mức INFO; log `eventId`, `eventType`, `organizationId`.

---

## 3. Catalog sự kiện

Tên event là hằng số dùng chung, **không** viết chuỗi rải rác:

| `eventType` | `aggregateType` | Producer | Consumer | Mục đích |
|---|---|---|---|---|
| `ClassTeacherChanged` | `CLASS` | People | Schedule | Đổi giáo viên phụ trách lớp |
| `ClassStatusChanged` | `CLASS` | People | Schedule | Trạng thái/đóng/hủy lớp thay đổi |
| `FacilityIncidentOpened` | `FACILITY_INCIDENT` | Facility | Schedule | Sự cố phòng/thiết bị mới |
| `FacilityIncidentResolved` | `FACILITY_INCIDENT` | Facility | Schedule | Sự cố đã được xử lý |

Không dùng `FacilityIncidentUpdated` ở Phase 2: luồng hiện tại chỉ có mở và giải quyết
(`FacilityService.reportIssue/resolveIssue`). Khi có luồng cập nhật, thêm event type mới với
`eventVersion` riêng.

---

## 4. `ClassTeacherChanged` (v1)

Phát khi: `SchoolClassService.assignTeacher/reassignTeacher` cập nhật thành công
(`SchoolClassRepository.assignTeacher > 0`).

```json
{
  "eventId": "…",
  "eventType": "ClassTeacherChanged",
  "eventVersion": 1,
  "organizationId": "org-uuid",
  "aggregateType": "CLASS",
  "aggregateId": "class-uuid",
  "aggregateVersion": 7,
  "occurredAt": "2026-11-20T03:15:00Z",
  "correlationId": "…",
  "payload": {
    "classId": "class-uuid",
    "classCode": "TOAN10A",
    "previousTeacherId": "teacher-uuid-cu",
    "newTeacherId": "teacher-uuid-moi",
    "classVersion": 7
  }
}
```

| Trường payload | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `classId` | UUID | Có | Trùng `aggregateId` |
| `classCode` | string | Có | Để hiển thị/log; không dùng làm khóa |
| `previousTeacherId` | UUID hoặc null | Không | `null` nếu lớp chưa từng có giáo viên |
| `newTeacherId` | UUID | Có | Giáo viên sau cập nhật |
| `classVersion` | long | Có | Trùng `aggregateVersion` |

Consumer (Schedule):

- Chỉ xét `session.status='scheduled' AND start_time > NOW()`.
- Ghi `session_impact` cho từng buổi; **không** cập nhật `session.teacher_id`.
- Lý do: chưa có quyết định tự động thay giáo viên toàn bộ buổi tương lai.

---

## 5. `ClassStatusChanged` (v1)

Phát khi một trong các thay đổi thành công:

- `ClassStatusService.cancel` (hủy trực tiếp hoặc yêu cầu hủy),
- `approveCancel`,
- `requestClose`,
- `approveClose`,
- `reopen`,
- `refresh` (tự chuyển `CHUA_BAT_DAU → DANG_DIEN_RA`, `DANG_DIEN_RA → DA_KET_THUC`).

```json
{
  "eventId": "…",
  "eventType": "ClassStatusChanged",
  "eventVersion": 1,
  "organizationId": "org-uuid",
  "aggregateType": "CLASS",
  "aggregateId": "class-uuid",
  "aggregateVersion": 8,
  "occurredAt": "2026-11-20T03:20:00Z",
  "correlationId": "…",
  "payload": {
    "classId": "class-uuid",
    "classCode": "TOAN10A",
    "previousStatus": "DANG_DIEN_RA",
    "newStatus": "DA_HUY",
    "previousCloseState": "NONE",
    "closeState": "NONE",
    "previousCancelState": "PENDING",
    "cancelState": "NONE",
    "reason": "Lớp không đủ học sinh",
    "effectiveAt": "2026-11-20T03:20:00Z"
  }
}
```

| Trường payload | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `classId`, `classCode` | UUID, string | Có | |
| `previousStatus`, `newStatus` | string | Có | `CHUA_BAT_DAU`, `DANG_DIEN_RA`, `DA_KET_THUC`, `DA_HUY` |
| `previousCloseState`, `closeState` | string | Có | `NONE`, `PENDING`, `CLOSED` |
| `previousCancelState`, `cancelState` | string | Có | `NONE`, `PENDING` |
| `reason` | string hoặc null | Không | Lý do đã trim; **không** chứa dữ liệu nhạy cảm |
| `effectiveAt` | ISO-8601 | Có | Thời điểm áp dụng |

Consumer (Schedule):

- Ghi `session_impact` `CLASS_STATUS_CHANGED` cho các buổi `scheduled` tương lai.
- Khi `closeState='CLOSED'`, `status='DA_HUY'` hoặc `status='DA_KET_THUC'`: đánh dấu impact OPEN.
- Khi `reopen` (`closeState='NONE'`) hoặc hủy bị từ chối: đánh dấu các impact cũ `RESOLVED`.
- **Không** tự hủy session, không xóa enrollment (chờ quyết định nghiệp vụ).

---

## 6. `FacilityIncidentOpened` (v1)

Phát khi: `FacilityService.reportIssue` tạo `incident_report` status `open` thành công.

```json
{
  "eventId": "…",
  "eventType": "FacilityIncidentOpened",
  "eventVersion": 1,
  "organizationId": "org-uuid",
  "aggregateType": "FACILITY_INCIDENT",
  "aggregateId": "incident-uuid",
  "aggregateVersion": null,
  "occurredAt": "2026-11-20T03:30:00Z",
  "correlationId": "…",
  "payload": {
    "incidentId": "incident-uuid",
    "equipmentId": "equipment-uuid",
    "equipmentName": "Máy chiếu",
    "roomId": "room-uuid",
    "status": "open",
    "occurredAt": "2026-11-20T03:30:00Z"
  }
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `incidentId` | UUID | Có | Trùng `aggregateId` |
| `equipmentId` | UUID | Có | |
| `equipmentName` | string | Không | Hiển thị; không chứa dữ liệu nhạy cảm |
| `roomId` | UUID hoặc null | Không | Lấy từ `equipment.room_id`; `null` nếu thiết bị chưa gán phòng |
| `status` | string | Có | `open` |
| `occurredAt` | ISO-8601 | Có | |

Không đưa `description`/`photoUrl`/`reportedBy` vào event.

Consumer (Schedule):

- Chỉ xử lý khi `roomId` khác null và tồn tại.
- Ghi `session_impact` `FACILITY_INCIDENT` cho các buổi tương lai dùng phòng đó.
- **Không** đổi phòng, không xóa buổi, không coi thiết bị hỏng là phòng không dùng được.

---

## 7. `FacilityIncidentResolved` (v1)

Phát khi: `FacilityService.resolveIssue` cập nhật `status='resolved'` thành công.

```json
{
  "eventId": "…",
  "eventType": "FacilityIncidentResolved",
  "eventVersion": 1,
  "organizationId": "org-uuid",
  "aggregateType": "FACILITY_INCIDENT",
  "aggregateId": "incident-uuid",
  "aggregateVersion": null,
  "occurredAt": "2026-11-21T01:00:00Z",
  "correlationId": "…",
  "payload": {
    "incidentId": "incident-uuid",
    "equipmentId": "equipment-uuid",
    "roomId": "room-uuid",
    "status": "resolved",
    "resolvedAt": "2026-11-21T01:00:00Z"
  }
}
```

Consumer (Schedule):

- Tìm `session_impact` `OPEN` có `source_type='FACILITY_INCIDENT' AND source_id=incidentId`.
- Đánh dấu `RESOLVED` nếu buổi vẫn còn dùng đúng phòng và chưa bị thay đổi thủ công.
- Không khôi phục session đã bị hủy/đổi phòng sau sự cố.

---

## 8. Thứ tự và idempotency

### 8.1. Khóa idempotency

- Consumer dùng `inbox_event(event_id, consumer_name)`.
- `consumer_name` cố định: `SCHEDULE_SYNC_V1`.
- Trùng `event_id`:
  - đã `PROCESSED` → `duplicate`, không áp dụng lại;
  - đang `PROCESSING` → `busy` (409);
  - `FAILED` → cho phép xử lý lại.

### 8.2. Thứ tự

- Với `CLASS`: so sánh `aggregateVersion` (tăng đơn điệu theo `school_class.version`).
  `aggregateVersion <= last_version` → `stale`, bỏ qua.
- Với `FACILITY_INCIDENT`: không có version; so sánh `occurredAt` với `last_occurred_at`.
  Event có `occurredAt` cũ hơn → `stale`.
- Event đến trễ nhưng mới hơn trạng thái hiện tại vẫn được áp dụng (không yêu cầu đúng thứ tự
  tuyệt đối, chỉ chặn ghi đè bởi event cũ).

### 8.3. Giao hàng

- **At-least-once**. Không tuyên bố exactly-once.
- Publisher có thể gửi lại sau timeout dù consumer đã xử lý → consumer phải idempotent.

---

## 9. Cách ly tổ chức

- `organizationId` trong envelope là nguồn duy nhất; không lấy từ query.
- Consumer kiểm tra:
  - `payload.classId`/`incidentId` phải tồn tại trong `org_id = organizationId`.
  - Session được cập nhật phải có `c.org_id = organizationId`.
- Payload chứa ID thuộc tổ chức khác → `400 rejected`, không ghi dữ liệu.

---

## 10. Tiến hóa schema

- Thêm trường **tùy chọn** vào payload: giữ `eventVersion` cũ; consumer cũ bỏ qua.
- Đổi ngữ nghĩa/xóa trường/đổi kiểu: tăng `eventVersion`.
- Consumer hỗ trợ `eventVersion` hiện tại; `eventVersion` lớn hơn mức hỗ trợ → `400 rejected`
  (không áp dụng mù).
- Không tái sử dụng tên event cho ngữ nghĩa khác.

---

## 11. Lưu trữ và điều tra

- Event nằm trong `outbox_event` ở producer; giữ tối thiểu 90 ngày (đề xuất).
- Schedule lưu `inbox_event` và `session_impact` để điều tra.
- Log đề xuất: `eventId`, `eventType`, `organizationId`, `aggregateId`, `attempts`, kết quả.
- Không log payload đầy đủ.

---

## 12. Tóm tắt nghĩa vụ hai phía

| Producer (People/Facility) | Consumer (Schedule) |
|---|---|
| Ghi nghiệp vụ + outbox cùng transaction | Kiểm tra envelope + org trước khi ghi |
| Không gửi trước commit | Idempotent theo `event_id` |
| Retry có giới hạn, không xóa event lỗi | Chặn event cũ theo version/occurredAt |
| Không đưa dữ liệu nhạy cảm vào payload | Không sửa `session` khi chưa có quyết định nghiệp vụ |
| Replay có quyền + dấu vết | Trả mã lỗi đúng để publisher phân loại |
