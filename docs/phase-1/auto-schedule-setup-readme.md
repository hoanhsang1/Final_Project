# Cách cấu hình và chạy xếp lịch tự động

Tài liệu ngắn cho **chủ tổ chức (Owner)** và **giáo vụ** để đi từ một tổ chức chưa cấu hình
đến lịch nháp đã xác nhận, chỉ bằng giao diện web.

## 0. Điều kiện cần

- Tài khoản đã đăng nhập vào MEMS, có `organizationId`.
- Hai module được bật cho tổ chức: **`SCHEDULE_MANAGEMENT`** (lịch học) và **`STUDENT_MANAGEMENT`**
  (lớp, chương trình, môn trong lớp). Bật ở màn hình quản trị module của Owner.
- Quyền tối thiểu:
  - `schedule.config` — cấu hình khung tiết, quy tắc lớp, lịch rảnh giáo viên.
  - `schedule.create` — tạo và xác nhận lịch nháp.
  - `schedule.view` — xem lịch học chính thức.
  - `subject.manage` — quản lý môn học, danh mục môn.
  - Quyền nhân sự (`employee.view` hoặc `teacher.change_status`) để mở hồ sơ giáo viên và khai
    chuyên môn.

Owner mặc định có các quyền trên. Giáo vụ cần được cấp qua vai trò/vị trí.

## 1. Cấu hình lịch — menu **Lịch & điểm danh → Cấu hình lịch** (`/dao-tao/cau-hinh-lich`)

Tab **Khung tiết** (bắt buộc, làm trước tiên):

- Khai báo các tiết trong ngày: số tiết liên tục từ 1, giờ kết thúc sau giờ bắt đầu, các tiết
  không chồng lấn. Bật **Ghép tiết sau** khi tiết học kéo dài sang tiết kế tiếp.
- Nhấn **Lưu cấu hình tiết**. Chưa có khung tiết thì mọi bước xếp lịch đều bị chặn
  (`SCHEDULE_CONFIG_MISSING`).

Tab **Quy tắc tiết của lớp** (tùy chọn):

- Chọn lớp → thêm quy tắc "Nghỉ (chặn)" hoặc "Được phép dạy" theo thứ và khoảng tiết.
- Không khai báo = lớp được phép mọi tiết. Quy tắc "nghỉ" luôn thắng quy tắc "cho phép".

Tab **Lịch rảnh giáo viên** (tùy chọn):

- Chọn giáo viên → khai khoảng "Không thể dạy" / "Có thể dạy".
- Không khai báo = giáo viên rảnh mọi tiết. "Không thể dạy" luôn thắng "Có thể dạy".

## 2. Môn học — menu **Đào tạo → Môn học** (`/dao-tao/mon-hoc`)

1. Mở **Danh mục môn học** → thêm danh mục (VD: *Lập trình*). Danh mục là cầu nối giữa chuyên
   môn giáo viên và môn học khi xếp lịch.
2. Thêm/sửa từng môn: mã (không trùng trong tổ chức), tên, danh mục, **yêu cầu phòng**
   (`ANY` / `LAB` / `COMPUTER`… tùy danh mục phòng của trường).
   Ngừng một môn/danh mục không làm hỏng lớp đang gắn; hệ thống cảnh báo số môn bị ảnh hưởng.

## 3. Chuyên môn & môn dạy được của giáo viên — menu **Nhân sự → Giáo viên**

- Mở chi tiết giáo viên → **Chuyên môn & danh mục môn học**: gán chuyên môn và **danh mục môn**
  tương ứng. Giáo viên dạy được mọi môn thuộc danh mục của chuyên môn đang hoạt động.
- Trường hợp đặc biệt: dùng ô **Môn dạy được** để thêm ngoại lệ từng môn (kèm lý do duyệt).
- Điều kiện bắt buộc khi gán giáo viên vào môn của lớp: giáo viên **đang ở trạng thái Đang dạy**
  và có chuyên môn cùng danh mục với môn (hoặc ngoại lệ đã duyệt). Sai điều kiện trả
  `SUBJECT_MISMATCH`.

## 4. Chương trình & lớp học — menu **Đào tạo → Chương trình đào tạo**, **Lớp học**

1. Chương trình đào tạo: khai các môn, thứ tự, số buổi/tuần, số phút/buổi, giai đoạn (stage).
   Môn tiên quyết phải ở giai đoạn trước — sai thứ tự trả `PREREQUISITE_STAGE_INVALID`, tạo vòng
   trả `PREREQUISITE_CYCLE`.
2. Lớp học: tạo lớp, gán môn cho lớp (**Môn học của lớp**) với số buổi/tuần và giai đoạn, có thể
   gán giáo viên ngay hoặc để trống cho bộ xếp lịch chọn.
3. Có thể dùng **Áp chương trình** để đưa môn từ chương trình vào lớp.

## 5. Xếp lịch tự động — menu **Lịch & điểm danh → Tự động xếp lịch**
(`/dao-tao/tu-dong-xep-lich`)

1. Chọn phòng ban (nếu tài khoản không bị giới hạn theo phòng ban).
2. Chọn khoảng ngày, các thứ được phép xếp, tick các lớp cần xếp.
3. Nhấn **Tạo lịch nháp**. Hệ thống chạy bộ xếp lịch trên ràng buộc: khung tiết, quy tắc lớp,
   lịch rảnh giáo viên, phòng theo yêu cầu môn, trùng giáo viên/phòng/lớp.
4. Xem lưới tuần:
   - Buổi có ngoại lệ (đổi phòng/giờ) được đánh dấu.
   - Mục **Chưa xếp được** liệt kê các buổi không tìm được chỗ kèm lý do — bổ sung giáo viên,
     nới khung tiết/rảnh rồi tạo lại nháp nếu cần.
5. Sửa tay một buổi: bấm vào buổi → đổi tiết bắt đầu/số tiết/giáo viên/phòng. Danh sách phòng
   gợi ý đã loại phòng bị buổi khác trong nháp chiếm; backend kiểm tra lại toàn bộ ràng buộc.
6. Nhấn **Xác nhận** → hệ thống kiểm tra lại từng buổi và ghi vào lịch chính thức. Nếu có buổi
   trùng, toàn bộ thay đổi bị hoàn tác và lý do hiện trên màn hình (`SCHEDULE_DRAFT_CONFIRM_FAILED`).
   Lịch nháp có hạn xác nhận **7 ngày** (`SCHEDULE_DRAFT_EXPIRED`).

## 6. Xem lịch chính thức — menu **Lịch & điểm danh → Lịch học** (`/dao-tao/lich-hoc`)

Lọc theo phòng ban/tuần/giáo viên/lớp. Buổi đã xác nhận từ lịch nháp xuất hiện ở đây.

## 7. Khi dữ liệu nguồn thay đổi (interlock sẵn có)

Các sự kiện từ People/Facility tự đánh dấu buổi bị ảnh hưởng vào bảng `session_impact`:

- **Đổi giáo viên của lớp** → mọi buổi tương lai của lớp bị đánh dấu (giáo viên không tự đổi).
- **Hủy/kết thúc lớp** → mọi buổi tương lai của **tất cả môn trong lớp** bị đánh dấu; mở lại lớp
  thì các đánh dấu được đóng.
- **Sự cố phòng** → mọi buổi tương lai dùng phòng đó bị đánh dấu; sự cố xong chỉ đóng khi buổi
  vẫn còn ở đúng phòng.

Giáo vụ xem danh sách qua API `GET /api/departments/{departmentId}/schedules/impacts?status=OPEN`
(quyền `schedule.view`). Hiện **chưa có panel hiển thị impact trên giao diện** — dùng API trực
tiếp hoặc Swagger.

## 8. Lỗi thường gặp

| Mã | Ý nghĩa / cách xử lý |
| --- | --- |
| `SCHEDULE_CONFIG_MISSING`, `TIME_SLOTS_REQUIRED` | Chưa có khung tiết — làm bước 1. |
| `TIME_SLOT_INVALID` | Số tiết không liên tục, giờ sai, hoặc tiết chồng lấn. |
| `CLASS_SLOT_RULE_INVALID`, `TEACHER_AVAILABILITY_INVALID` | Tiết nằm ngoài khung tiết hoặc chồng lấn. |
| `SUBJECT_MISMATCH` | Giáo viên không đủ điều kiện dạy môn — xem bước 3. |
| `SCHEDULE_DRAFT_NOT_EDITABLE`, `SCHEDULE_DRAFT_EXPIRED` | Nháp đã xác nhận/huỷ hoặc quá 7 ngày — tạo nháp mới. |
| `SCHEDULE_DRAFT_ITEM_CONFLICT` | Buổi sửa tay trùng giáo viên/phòng/lớp — chọn phương án khác. |

## 9. Giới hạn đã biết

- Không tự đổi giáo viên/phòng khi có sự kiện — chỉ đánh dấu để người có quyền xử lý.
- Chưa có màn hình duyệt impact (chỉ API).
- Ngoài phạm vi: điểm danh, đơn đổi/bù lịch, nhập Excel, dashboard.
