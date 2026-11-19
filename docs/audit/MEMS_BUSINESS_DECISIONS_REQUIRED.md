# MEMS — Các quyết định nghiệp vụ cần chốt

Ngày lập: 2026-11-19 · Nhánh `fixFlowCreateEmployee` · HEAD `afbd6f5`
Tài liệu này **không** phải đặc tả đã chốt. Mỗi mục nêu hiện trạng source, vấn đề, hai phương án và khuyến nghị kỹ thuật; quyết định cuối cùng thuộc BA/PO.

Quy ước: “Đề xuất” là ý kiến kỹ thuật, không phải quy tắc nghiệp vụ đã được duyệt.

---

## Q1. CENTER có cho sinh viên học nhiều lớp cùng lúc không?
- **Hiện trạng source:** `SchoolClassRepository.enrollStudent` chặn nếu sinh viên đã có bất kỳ dòng `class_student`; DB có unique theo sinh viên (`DB_11_16.sql:124`). Không phân biệt SCHOOL/CENTER.
- **Vấn đề:** mô hình 1 lớp/sinh viên làm học viên trung tâm không thể học song song; cũng không thể học lớp kế tiếp sau khi lớp cũ kết thúc (STU-01).
- **Phương án A — một lớp hoạt động tại một thời điểm:** giữ kiểm tra nhưng chỉ tính lớp `CHUA_BAT_DAU`/`DANG_DIEN_RA`; lớp `DA_KET_THUC`/`DA_HUY` chỉ còn là lịch sử. Cần bỏ unique một cột, thay bằng unique `(student_id, class_id)`.
- **Phương án B — nhiều lớp song song:** bảng enrollment có `status`, `enrollment_start/end`; không giới hạn số lớp; xếp lịch phải kiểm trùng giờ của sinh viên.
- **Ưu/nhược:** A ít thay đổi UI/API, giữ đơn giản; B đúng nghiệp vụ trung tâm nhưng ảnh hưởng Schedule (kiểm trùng lịch sinh viên), học phí, báo cáo.
- **Ảnh hưởng DB/API/FE:** A cần migration nới unique + sửa truy vấn active; B cần bảng mới, API enrollment, UI chọn nhiều lớp.
- **Khuyến nghị:** nếu chưa chốt, dùng A làm mặc định an toàn và giữ thiết kế B trong tài liệu; **chưa tạo migration** khi chưa xác nhận.
- **Trạng thái:** CẦN XÁC NHẬN.

## Q2. SCHOOL và CENTER có chính sách enrollment khác nhau không?
- **Hiện trạng:** code không có nhánh `OrgType` cho enrollment; `org_type` chỉ dùng khi đăng ký.
- **Vấn đề:** nếu SCHOOL 1 lớp/lúc và CENTER nhiều lớp, cần cấu hình theo tổ chức thay vì hard-code.
- **Phương án A:** một chính sách chung cho cả hai. **B:** cấu hình `max_active_classes` theo tổ chức (0 = không giới hạn).
- **Khuyến nghị:** chọn A nếu chưa có yêu cầu; B nếu CENTER là mô hình kinh doanh chính.
- **Trạng thái:** CẦN XÁC NHẬN.

## Q3. Phòng học/thiết bị là tài nguyên cấp tổ chức hay phòng ban?
- **Hiện trạng:** `facility.department_id` bắt buộc; `internalRooms` lọc theo phòng ban; `ScheduleService.roomSuggestions` chỉ lấy phòng của phòng đang xếp lịch; `validateRoom` nhận mọi phòng trong tổ chức (SCH-02).
- **Vấn đề:** phòng Đào tạo không thấy phòng do CSVC quản lý; hai nơi kiểm tra khác nhau.
- **Phương án A — tài nguyên cấp tổ chức, CSVC là đơn vị quản lý:** bỏ lọc `department_id` khi đọc cho xếp lịch; giữ `department_id` cho vận hành/báo cáo.
- **Phương án B — tài nguyên thuộc phòng ban:** thêm cơ chế “mượn/chia sẻ phòng” (bảng hoặc cờ `shared`).
- **Ảnh hưởng:** A sửa API nội bộ + gợi ý phòng, không đổi dữ liệu; B cần bảng mới và quy trình duyệt mượn.
- **Khuyến nghị:** A khớp tài liệu thiết kế hiện có (`planned-content`) và ít rủi ro dữ liệu.
- **Trạng thái:** CẦN XÁC NHẬN — **không sửa** DB/quyền trong đợt này.

## Q4. Phòng ban nào được quyền sử dụng phòng do CSVC quản lý?
- **Hiện trạng:** `FacilityService` kiểm quyền theo `facility.*` + scope; báo sự cố chỉ cho thiết bị trong phòng ban người báo.
- **Vấn đề:** chưa có khái niệm “phòng dùng chung” hay danh sách phòng ban được phép.
- **Phương án A:** mọi phòng ban có quyền `schedule.create` được dùng mọi phòng trong tổ chức. **B:** chỉ phòng ban được CSVC cấp phép (bảng `room_share`).
- **Khuyến nghị:** A cho giai đoạn hiện tại; B khi cần kiểm soát tài nguyên.
- **Trạng thái:** CẦN XÁC NHẬN.

## Q5. Lớp thuộc phòng ban nào?
- **Hiện trạng:** `school_class` không có `department_id`; phạm vi xem suy từ giáo viên hoặc người tạo (`SchoolClassRepository.inDepartments`); người duyệt suy từ `department_module`; lịch theo phòng trong URL (CLS-04).
- **Vấn đề:** lớp chưa có giáo viên do người ngoài phòng tạo sẽ vô hình với trưởng phòng; giáo viên chuyển phòng làm lớp “đổi chủ”.
- **Phương án A:** thêm `school_class.department_id` (phòng phụ trách) bắt buộc khi tạo; backfill theo giáo viên/người tạo nếu xác định được. **B:** giữ suy diễn, chỉ thêm quy tắc dự phòng (người tạo).
- **Ảnh hưởng:** A cần migration + sửa mọi truy vấn scope và `ClassApprovalPolicy`; B không đổi schema nhưng tiếp tục mơ hồ.
- **Khuyến nghị:** A về dài hạn; trước mắt ghi nhận B và không backfill tự động khi không có quan hệ xác định (đã ghi ở `AUDIT_LICH_CU_department_id_item11.md`).
- **Trạng thái:** CẦN XÁC NHẬN.

## Q6. Ai duyệt đóng/hủy lớp khi lớp chưa có giáo viên?
- **Hiện trạng:** `ClassApprovalPolicy` duyệt theo trưởng phòng phụ trách module → Tổng quản lý được ủy quyền → Owner. Lớp chưa có giáo viên vẫn có thể xác định phòng theo người tạo (Q5) hoặc không xác định được.
- **Vấn đề:** nếu không suy được phòng, yêu cầu có thể không có người duyệt cấp 1.
- **Phương án A:** rơi xuống Owner. **B:** người tạo lớp (nếu là giáo vụ cấp tổ chức) thuộc phòng Đào tạo mặc định.
- **Khuyến nghị:** A an toàn, B đúng nghiệp vụ nếu có phòng Đào tạo chuẩn.
- **Trạng thái:** CẦN XÁC NHẬN.

## Q7. Nghỉ việc có ngày hiệu lực và bàn giao không?
- **Hiện trạng:** duyệt xong vô hiệu tài khoản và thu hồi chức danh ngay; bảng `resignation_request` không có `effective_date`/bàn giao (RES-04).
- **Vấn đề:** thực tế nhân sự nghỉ theo ngày thỏa thuận; cần thời gian bàn giao lớp.
- **Phương án A — hiệu lực ngay:** giữ hiện trạng, phù hợp nghỉ đột xuất. **B — có `effective_date`:** scheduler thực thi offboarding đúng ngày, cho rút đơn trước ngày hiệu lực.
- **Ảnh hưởng:** B cần cột + scheduler + UI chọn ngày; A không đổi.
- **Khuyến nghị:** B nếu có HR thực tế; nếu chưa, giữ A và ghi rõ giới hạn.
- **Trạng thái:** CẦN XÁC NHẬN.

## Q8. Giáo viên chuyển phòng có giữ lớp đang dạy không?
- **Hiện trạng:** `transferToDepartment` thu hồi mọi chức danh phạm vi phòng cũ, không gán gì ở phòng mới; mọi lớp bị gắn nhãn phân công lại (TRF-03).
- **Vấn đề:** giáo viên mất chức danh TEACHER dù vẫn có thể dạy; gián đoạn lớp không cần thiết.
- **Phương án A — giữ lớp đến hết kỳ:** giữ assignment TEACHER (hoặc bản ghi “đang dạy”) đến khi có giáo viên thay. **B — cắt ngay:** thu hồi và bắt buộc phân công lại.
- **Khuyến nghị:** A nếu chuyển phòng không đồng nghĩa ngừng dạy; cần cờ “dạy liên phòng”.
- **Trạng thái:** CẦN XÁC NHẬN.

## Q9. Giáo viên chuyển phòng được cấp chức danh mới khi nào?
- **Hiện trạng:** không có bước chọn/gán chức danh đích trong yêu cầu điều chuyển.
- **Phương án A:** yêu cầu điều chuyển có `positionIds` đích, áp dụng ở bước cuối. **B:** trưởng phòng đích gán sau khi nhận.
- **Khuyến nghị:** A minh bạch hơn, nhưng cần quyền của người tạo đối với chức danh đích; B đơn giản hơn.
- **Trạng thái:** CẦN XÁC NHẬN.

## Q10. Khi trưởng phòng vắng, ai thay thế người duyệt điều chuyển?
- **Hiện trạng:** chỉ người giữ chức danh trưởng phòng quyết bước SOURCE_HEAD/TARGET_HEAD; Owner không thay được (TRF-01).
- **Phương án A:** Owner thay khi không còn trưởng phòng. **B:** Tổng quản lý được ủy quyền thay. **C:** trưởng phòng chỉ định người đại diện có thời hạn.
- **Khuyến nghị:** A + C; B chỉ khi ủy quyền còn hiệu lực.
- **Trạng thái:** CẦN XÁC NHẬN.

## Q11. Thời hạn duyệt điều chuyển là bao lâu và quá hạn thì làm gì?
- **Hiện trạng:** thuộc tính `transfer.approval.deadline-days` là TODO, chưa đọc.
- **Phương án A:** hết hạn → nhắc người duyệt, không tự duyệt. **B:** hết hạn → leo thang lên cấp trên. **C:** hết hạn → tự hủy yêu cầu.
- **Khuyến nghị:** A + leo thang thủ công có audit; không tự duyệt (nguyên tắc chống tự duyệt).
- **Trạng thái:** CẦN XÁC NHẬN.

## Q12. “Cấp duyệt nghỉ việc không khả dụng” xác định thế nào?
- **Hiện trạng:** nếu tồn tại bất kỳ người giữ `approve_resignation` trực tiếp thì chỉ họ duyệt; không có khái niệm vắng mặt/quá hạn (RES-02).
- **Phương án A:** dựa trên trạng thái nhân sự (đã nghỉ/chuyển phòng). **B:** dựa trên thời gian chờ quá X ngày → leo thang. **C:** thủ công có lý do.
- **Khuyến nghị:** A tự động + C làm đường thoát; B cần SLA được chốt.
- **Trạng thái:** CẦN XÁC NHẬN.

## Q13. Sinh viên bị đình chỉ có được đăng nhập không?
- **Hiện trạng:** `StudentService.update/delete` không đụng tài khoản Identity; sinh viên vẫn đăng nhập được (STU-02).
- **Phương án A — chặn đăng nhập:** disable account khi `suspended`/`inactive`/xoá mềm. **B — chỉ chặn nghiệp vụ:** vẫn đăng nhập xem hồ sơ nhưng chặn lớp/lịch.
- **Khuyến nghị:** A đúng kỳ vọng bảo mật; cần thu hồi refresh token.
- **Trạng thái:** CẦN XÁC NHẬN.

## Q14. Username sinh viên là email hay mã sinh viên?
- **Hiện trạng:** khi cấp tài khoản, username = email; email có thể trùng username nhân sự.
- **Phương án A:** giữ email (dễ nhớ, cần unique toàn hệ thống). **B:** mã sinh viên (ổn định, không phụ thuộc email).
- **Ảnh hưởng:** B cần đổi luồng cấp tài khoản, UI đăng nhập, migration account cũ.
- **Khuyến nghị:** B về dài hạn; A nếu đã có nhiều dữ liệu.
- **Trạng thái:** CẦN XÁC NHẬN.

## Q15. Có cho phép nhiều Owner hoặc chuyển giao quyền chủ không?
- **Hiện trạng:** đăng ký tạo đúng một ORG_OWNER; không có API chuyển giao/khôi phục (AUTH-05).
- **Phương án A:** nhiều Owner. **B:** một Owner + quy trình chuyển giao xác nhận hai bên/SUPER_ADMIN. **C:** chỉ SUPER_ADMIN khôi phục sau kiểm chứng.
- **Khuyến nghị:** B + C; A làm tăng rủi ro nhiều chủ.
- **Trạng thái:** CẦN XÁC NHẬN.

## Q16. Khớp chuyên môn giáo viên – môn học theo tên hay liên kết cấu trúc?
- **Hiện trạng:** so sánh `specialty.name_unaccented = subject.name_unaccented`; “Toán 10” không khớp “Toán” (TCH-02).
- **Phương án A — liên kết `subject.specialty_id`:** chính xác, hỗ trợ phân cấp. **B — so khớp tên mở rộng (prefix):** nhanh nhưng mơ hồ.
- **Ảnh hưởng:** A cần migration dữ liệu môn/chuyên môn + UI chọn; B chỉ sửa repository.
- **Khuyến nghị:** A; trước mắt FE xử lý `409 SPECIALTY_MISMATCH` + `confirm=true` để không chặn người dùng.
- **Trạng thái:** CẦN XÁC NHẬN.

---

## Phụ lục — câu hỏi vận hành (không thuộc 16 câu BA nhưng cần chốt)
- **Q17:** Mã sinh viên/lớp sau xoá mềm có được tái sử dụng không? (STU-04)
- **Q18:** Khi module FACILITY bị tắt, sự cố đang mở có chặn tắt hay chỉ chuyển chỉ đọc? (MOD-03)
- **Q19:** Ai được xem nhật ký tổ chức ngoài Owner? (CC-06)
