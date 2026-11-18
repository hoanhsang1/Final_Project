# MEMS — ĐẶC TẢ NGHIỆP VỤ HỢP NHẤT SAU PHẢN BIỆN

**Phiên bản:** 3.0 — BẢN NHÁP / CHỜ XÁC NHẬN  
**Ngày tổng hợp:** 15/11/2026  
**Phạm vi:** Modular Education Management System (MEMS), trường học và trung tâm giáo dục  
**Mục đích:** Tổng hợp nội dung đã tranh luận, giữ quy tắc đang được mô tả, sửa các kết luận AI thiếu căn cứ, lập danh sách quyết định cần chốt. **Không phải tài liệu đã được chủ dự án phê duyệt.**

> **GIỚI HẠN NGUỒN:** Lần tranh luận này chỉ cung cấp cho AI **83/657 dòng** tài liệu Word D1 và **168/1.106 dòng** sơ đồ draw.io D2; cả hai đều bị cắt. Chưa có tài liệu vận hành thực tế của một trường/trung tâm cụ thể, chưa đối chiếu code và chưa đọc được đầy đủ các mục 11–18 mà D1 đề nghị ưu tiên. Vì vậy, những nội dung dưới đây là **bản hợp nhất có kiểm soát theo phạm vi chứng cứ**, không phải đánh giá đã bao phủ tất cả nghiệp vụ MEMS. Nguồn: `coverage.json`, `state(1).json`, `debate(1).md`, `business-review.md`, `role-permission-matrix.md`, `proposed-flows.md`.

## 1. DỰ ÁN MEMS CẦN NHỮNG TÀI LIỆU NÀO?

**Phân biệt:** (a) để chạy một ứng dụng về kỹ thuật cần mã nguồn, cấu hình, phụ thuộc, hạ tầng và dữ liệu; (b) để **xây đúng sản phẩm** và bàn giao được, nhóm nên có các tài liệu dưới đây. Không có số lượng tài liệu bắt buộc áp dụng cho mọi dự án; có thể gộp các tài liệu nhỏ miễn đầy đủ và nhất quán.

| Mức | Tài liệu | Nội dung tối thiểu | Vai trò đối với MEMS |
|---|---|---|---|
| P0 | Tầm nhìn, phạm vi và stakeholder (Vision/Scope) | Mục tiêu, người dùng, loại tổ chức, module trong/ngoài phạm vi, tiêu chí thành công | Ngăn làm rộng đề tài và nhầm giữa trường học/trung tâm |
| P0 | Đặc tả yêu cầu nghiệp vụ (BRD/PRD) | Quy tắc, thuật ngữ, giả định, yêu cầu chức năng/phi chức năng, ưu tiên | Tài liệu gốc để triển khai theo đúng mong muốn |
| P0 | Danh mục use case và quy trình (AS-IS/TO-BE) | Actor, trigger, điều kiện trước, bước, nhánh từ chối, ngoại lệ, kết quả, SLA khi có quyết định | Kiểm tra flow thực tế, tránh quy trình thiếu bước |
| P0 | Ma trận vai trò — quyền — phạm vi (RBAC/ABAC) | Quyền *theo đối tượng và hành động*, tổ chức/phòng ban/cá nhân, người cấp và người duyệt | Cốt lõi cho Owner, HR, Tổng quản lý, giáo vụ |
| P0 | Nhật ký quyết định (Decision Log/ADR nghiệp vụ) | Vấn đề, phương án, quyết định, lý do, người duyệt, ngày, ảnh hưởng | Tách quy tắc đã chốt khỏi đề xuất AI |
| P1 | Từ điển dữ liệu / ERD | Thực thể, định nghĩa, quan hệ, vòng đời và ràng buộc dữ liệu | Chuyển quy trình sang model nhất quán |
| P1 | Kiến trúc và tích hợp (HLD/LLD) | Service ownership, luồng dữ liệu, sơ đồ thành phần, xử lý lỗi tích hợp | Phối hợp các microservice của MEMS |
| P1 | Hợp đồng API / giao diện | Endpoint, actor, quyền, request/response, mã lỗi, quy tắc trạng thái | FE/BE phát triển không hiểu khác nhau |
| P1 | Kế hoạch kiểm thử và nghiệm thu (Test/UAT) | Scenario thông thường, ngoại lệ, bảo mật, dữ liệu thử, tiêu chí pass/fail | Kiểm chứng từng flow trước demo/bàn giao |
| P1 | Hướng dẫn chạy, triển khai và vận hành (README/Runbook) | Cài đặt, cấu hình mẫu không có secret, build, migration, môi trường, backup, rollback | Để phần mềm **thực sự chạy** trên máy khác |
| P2 | Bản đồ truy vết (Traceability), backlog & release note | Requirement → Flow → API → Test → Sprint; thay đổi giữa phiên bản | Kiểm soát tiến độ và tác động thay đổi |

**Để chạy MEMS Debate Engine**, bộ tài liệu đầu vào tối thiểu nên là: (1) BRD/PRD; (2) sơ đồ hoặc mô tả từng flow; (3) ma trận quyền; (4) decision log ghi rõ nội dung đã chốt. Nếu muốn AI nhận xét **sát thực tế**, cần thêm (5) tài liệu quy trình/SOP hoặc phỏng vấn stakeholder của cơ sở giáo dục mục tiêu làm nguồn đối chiếu. Chỉ dựa vào suy luận của AI không đủ để xác nhận “đúng thực tế”.

## 2. QUY ƯỚC TRẠNG THÁI VÀ NGUỒN

- **[DOC]**: Quy tắc thực sự xuất hiện trong phần tài liệu gốc mà AI được cung cấp; không đồng nghĩa đã triển khai hoặc đã được nhóm phê duyệt cuối cùng.
- **[DEBATE]**: Vấn đề hoặc lập luận xuất hiện trong 12 lượt phản biện, cần phân biệt với sự thật đã xác minh.
- **[PROPOSAL]**: Đề xuất sửa/bổ sung trong bản này; **không tự động thay AS-IS**.
- **[DECISION REQUIRED]**: Cần Owner/nhóm dự án quyết định trước khi thay tài liệu gốc.
- **[UNKNOWN]**: Nguồn đã đọc không đủ để kết luận.

**Nguồn truy vết:** D1 = `MEMS_Tai_lieu_dac_ta_tong_hop_v2_phan_bien_flows.docx`; D2 = `MEMS_so_do_chuc_nang_theo_vai_tro_v2.drawio`. Chỉ có thể truy vết những dòng D1/D2 hiện diện trong `state(1).json`; tham chiếu dạng `[D1:L31]` hoặc `[D2:L17]` là số dòng **trích xuất** của engine, không nhất thiết là số dòng hiển thị trong Word/draw.io. Các tài liệu đầu ra của AI không phải nguồn gốc độc lập.

## 3. PHẠM VI VÀ QUY TẮC CỐT LÕI ĐANG ĐƯỢC MÔ TẢ

### 3.1 Phạm vi hệ thống

[DOC] MEMS quản lý nhiều tổ chức giáo dục, cấu hình module và phân quyền theo role, chức vụ, bundle, ủy quyền và phạm vi. Nhóm nghiệp vụ được mô tả: tổ chức, phòng ban, nhân sự, học sinh/sinh viên/học viên, giáo viên, lớp, lịch, phòng, thiết bị, phê duyệt. [D1:L10, D1:L25]

[DOC] Module được nhóm thành HR_MANAGEMENT, ACADEMIC_MANAGEMENT, SCHEDULE_MANAGEMENT, FACILITY_MANAGEMENT và nhóm quyền SELF; Owner bật/tắt module Optional, module lõi không được tắt. [D1:L37–L42]

[DOC] D2 thể hiện module lõi Sinh viên, Giáo viên, Lớp, Lịch; Owner điều khiển module Optional trong tổ chức, Super Admin có cơ chế can thiệp/khóa ở cấp nền tảng. [D2:L35]

### 3.2 Các nguyên tắc cần giữ nguyên cho đến khi nhóm chốt thay đổi

1. [DOC] Một nhân viên thuộc **một phòng ban tại một thời điểm**, nhưng có thể giữ **nhiều chức vụ**. [D1:L26]
2. [DOC] Tổng quản lý **là chức danh, không phải role đăng nhập**, không tự có mọi quyền; Owner quyết định quyền ủy quyền, phạm vi, thời hạn, thu hồi; không được ủy quyền tiếp. [D1:L18, D1:L35, D1:L80]
3. [DOC] HR có thể được cấp quyền quản lý xuyên phòng ban **trong cùng tổ chức**; quyền hiệu lực phụ thuộc quyền và scope, không phải vị trí phòng ban đang trực thuộc. [D1:L19, D1:L25]
4. [DOC] Không tự duyệt yêu cầu do chính tài khoản khởi tạo; nếu thiếu người duyệt có quy tắc leo thang Trưởng phòng → Tổng quản lý → Owner, nhưng điều kiện/timing chi tiết chưa rõ. [D1:L26, D1:L82]
5. [DOC] Owner được mô tả có thể trực tiếp thao tác nghiệp vụ trong phạm vi tổ chức, kèm ghi audit; không có nghĩa Owner được can thiệp tùy ý ở tổ chức khác hoặc thay Super Admin. [D1:L79, D1:L82]
6. [DOC] Dữ liệu nghiệp vụ phải được giới hạn đúng tổ chức/phạm vi; document đề xuất backend kiểm tra organizationId/departmentId; chưa chứng minh code đã làm đúng. [D1:L14, D1:L25]

## 4. VAI TRÒ VÀ RANH GIỚI QUYỀN

| Actor/chức danh | Chức năng đã mô tả trong nguồn | Giới hạn quan trọng | Cần bổ sung đặc tả |
|---|---|---|---|
| SUPER_ADMIN | Duyệt/từ chối tổ chức; tạm ngưng/kích hoạt; quản lý tài khoản và audit nền tảng; quản lý danh mục module [D1:L75; D2:L7] | Không vận hành lớp/phòng ban của tổ chức theo mặc định [D1:L75] | Cấp hỗ trợ kỹ thuật khi có sự cố, bảo vệ dữ liệu cá nhân, hạn chế đổi role |
| OWNER / ORG_OWNER | Quản lý tổ chức, phòng ban, chức vụ, nhân sự; bổ nhiệm Tổng quản lý; ủy quyền; điều khiển module Optional [D1:L79] | Phạm vi **tổ chức mình**; thao tác trực tiếp phải ghi audit [D1:L82] | Quyền nào tuyệt đối không được ủy quyền; khẩn cấp; xóa vĩnh viễn |
| TỔNG QUẢN LÝ | Thực hiện đúng quyền Owner đã ủy quyền; có thời hạn và scope [D1:L80] | Không nhận sẵn quyền Owner; không được ủy quyền lại | Gói quyền mẫu tự chọn và cơ chế dự phòng lúc Owner vắng mặt |
| QUẢN TRỊ VIÊN TỔ CHỨC | D2 mô tả là chức vụ mặc định, gắn catalog quyền/bundle [D1:L81; D2:L13] | **Không tự đồng nhất với Tổng quản lý**; không phải role đăng nhập | Cách chỉ định; có thật sự được giữ mọi quyền nghiệp vụ không |
| HR / MANAGER | Quản lý hồ sơ nhân sự, gán/thay đổi chức vụ, hồ sơ giáo viên, yêu cầu nghỉ việc, bước HR của điều chuyển [D1:L83; D2:L15] | Kiểm tra `org_id`, scope được cấp; không suy ra HR được bổ nhiệm Tổng quản lý | Giới hạn quyền bổ nhiệm, nhạy cảm dữ liệu, duyệt khi tự khởi tạo |
| TRƯỞNG PHÒNG | Duyệt yêu cầu hủy/đóng lớp; bước chuyển phòng nguồn/đích; một số thay đổi lịch [D2:L17] | Không tự duyệt yêu cầu của mình | Quyền sửa dữ liệu lớp, ủy quyền tạm khi vắng mặt |
| GIÁO VỤ | Quản lý sinh viên/học viên, lớp, phân công giáo viên, gửi duyệt hủy/đóng lớp [D2:L16] | Phạm vi và module hiệu lực; không tự duyệt nếu cũng giữ chức Trưởng phòng | Điều kiện hủy/đóng/mở lại, học viên đã đăng ký, lịch liên quan |
| GIÁO VIÊN | Xem lớp/lịch được phân công; điểm danh/đổi lịch khi có quyền; báo sự cố khi được cấp quyền [D1:L22; D2:L19] | Không mặc định có quyền CRUD lớp/hồ sơ sinh viên | Sửa hồ sơ bản thân, xin nghỉ/đổi lịch, dữ liệu điểm danh |
| NHÂN VIÊN CSVC | Quản lý phòng, thiết bị, báo/xử lý sự cố nếu module bật [D1:L23; D2:L18] | Phạm vi quyền được cấp; phòng/thiết bị thuộc cấp tổ chức [D2:L18] | Quy trình phân công, sửa chữa, nghiệm thu, chi phí |
| SINH VIÊN / HỌC VIÊN | Xem dữ liệu bản thân: hồ sơ, lớp, lịch, chuyên cần [D1:L24; D2:L21] | SELF, không vào console quản trị | Tên hiển thị theo trường/trung tâm; yêu cầu chỉnh sửa dữ liệu cá nhân |

**Chú ý ma trận:** Không dùng bảng `Tạo/Xem/Sửa/Xóa` chung từ báo cáo AI để quyết định quyền. Phải nêu đối tượng rõ ràng: `class.create`, `class.close.request`, `class.close.approve`, `employee.position.assign`, `module.toggle`... và phạm vi mỗi quyền. Báo cáo `role-permission-matrix.md` chưa đáp ứng độ chi tiết này.

## 5. ĐẶC TẢ QUY TRÌNH NGHIỆP VỤ HỢP NHẤT

### WF-01 — Đăng ký, xét duyệt và kích hoạt tổ chức

- **[DOC] Phần đã mô tả:** Super Admin có quyền duyệt/từ chối, tạm ngưng/kích hoạt tổ chức; Owner quản lý tổ chức của mình. [D1:L16–L17, D2:L7]
- **[UNKNOWN] Thiếu từ nguồn trích:** Ai được tự đăng ký, mẫu hồ sơ, điều kiện duyệt, thời hạn xử lý, xử lý yêu cầu bổ sung, trách nhiệm khi bị từ chối.
- **[PROPOSAL] Flow ứng viên:** Người đăng ký gửi hồ sơ → kiểm tra dữ liệu → chờ xét duyệt → Super Admin duyệt/từ chối/yêu cầu bổ sung → nếu duyệt, kích hoạt tổ chức và quyền Owner → gửi thông báo, lưu lịch sử. Mọi trạng thái và điều kiện chuyển trạng thái cần nhóm xác nhận.
- **[DECISION REQUIRED]** Quy định bằng chứng xác minh tổ chức, người đăng ký Owner, lý do từ chối, quy trình mở khóa.

### WF-02 — Thiết lập phòng ban, chức vụ, phân công và ủy quyền

- **[DOC] AS-IS:** Owner quản lý phòng ban, chức vụ, nhân sự, gán chức vụ, bổ nhiệm/bãi nhiệm Tổng quản lý, ủy quyền có scope/thời hạn/thu hồi. [D1:L35, D1:L79–L80]
- **[DOC] Ranh giới:** Tổng quản lý không tự có quyền và không được ủy quyền lại; HR được cấp quyền xuyên phòng ban trong cùng tổ chức. [D1:L18–L19]
- **[DEBATE]** AI lo ngại khi Owner vắng mặt, quy trình bị đình trệ; đây là rủi ro vận hành **không phải chứng cứ** rằng Tổng quản lý phải có quyền mặc định.
- **[PROPOSAL] Bước nghiệp vụ:** Owner chọn người → chọn chức danh/permission bundle và scope → cấu hình ngày hiệu lực/hết hạn → người có thẩm quyền xác nhận → hệ thống lưu audit → thông báo → thu hồi/hết hạn khiến quyền hết hiệu lực. Nếu thiếu Owner, dùng cơ chế ứng phó được phê duyệt riêng, không tự thăng quyền.
- **[DECISION REQUIRED]** Có cho phép gói ủy quyền mẫu? Chức vụ Quản trị viên tổ chức khác Tổng quản lý như thế nào? Quyền nào không được ủy quyền? Khi Owner vắng mặt ai có quyền can thiệp và theo điều kiện gì?

### WF-03 — Chuyển phòng ban của nhân viên

- **[DOC] AS-IS (chưa thay đổi):** Yêu cầu chuyển nhân sự lần lượt đi qua `SOURCE_HEAD → TARGET_HEAD → HR → EMPLOYEE`; một bên từ chối thì dừng; sau 4 bước được chấp thuận mới chuyển phòng và xử lý phân công cũ. [D1:L31]
- **[DOC] Bất biến:** Một nhân viên chỉ thuộc một phòng ban tại một thời điểm và có thể giữ nhiều chức vụ. Owner không bị điều chuyển phòng ban. [D1:L26, D1:L82]
- **[DEBATE]** Các agent đề xuất bỏ quyền “phê duyệt” của Employee, thay bằng xác nhận/thông báo. **Không có đủ bằng chứng** để gọi bước cũ sai trong mọi tổ chức: điều chuyển do doanh nghiệp quyết định khác với yêu cầu chuyển do nhân viên tự nguyện.
- **[PROPOSAL] Luồng ứng viên, chưa phê duyệt:** (1) Người có quyền khởi tạo và nêu lý do, phòng nguồn/đích, thời điểm dự kiến. (2) Kiểm tra org và trạng thái nhân viên. (3) Source Head xem bàn giao; Target Head xem tiếp nhận; HR kiểm tra hồ sơ và chức vụ. (4) Xử lý Employee theo **một trong hai nhánh phải chốt**: **A** cần đồng ý trước khi hiệu lực, hoặc **B** chỉ xác nhận đã nhận thông báo sau quyết định quản trị. (5) Chốt người quyết định cuối và ngày hiệu lực. (6) Cập nhật phòng ban, chức vụ/phân công liên quan nhất quán, ghi audit, thông báo.
- **[PROPOSAL] Ngoại lệ cần mô tả:** Một người giữ đồng thời Source/Target/HR; thiếu trưởng phòng; nhân viên đang phụ trách lớp; quyền phê duyệt bị thu hồi giữa luồng; yêu cầu trùng hoặc điều chuyển đồng thời; bên duyệt từ chối; đơn vị đích ngừng hoạt động; rollback khi dữ liệu không thể cập nhật nhất quán.
- **[DECISION REQUIRED]** Nhân viên phải đồng ý hay chỉ nhận thông báo? Ai khởi tạo? Thẩm quyền người duyệt cuối? Khi nào quyền và chức vụ mới có hiệu lực? Quy tắc giữ/bàn giao chức vụ khi chuyển?
- **KHÔNG tự áp dụng:** “Employee không phản hồi sau 7 ngày → tự động từ chối” chỉ xuất hiện trong tài liệu AI tạo ra và **mâu thuẫn** với TO-BE đã bỏ bước Employee phê duyệt. Chưa có quyết định SLA 7 ngày.

### WF-04 — Nghỉ việc, ngừng hoạt động và bàn giao

- **[DOC] AS-IS:** HR khởi tạo và phê duyệt/từ chối; duyệt thì nhân sự chuyển `INACTIVE`, thực hiện offboarding, lớp học có thể cần phân công lại. [D1:L33]
- **[DEBATE]** Rủi ro phân tách nhiệm vụ nếu cùng tài khoản HR vừa tạo vừa duyệt; điểm này cần đối chiếu quy tắc `SELF_APPROVAL_NOT_ALLOWED` [D1:L82].
- **[PROPOSAL] Flow:** Nộp yêu cầu có lý do/ngày hiệu lực → xác định người xét duyệt khác người khởi tạo → rà soát lớp, lịch, thiết bị, chức vụ, ủy quyền → quyết định duyệt/từ chối → bàn giao → vô hiệu quyền truy cập theo thời điểm hiệu lực → lưu lịch sử và thông báo.
- **[DECISION REQUIRED]** Ai có quyền phê duyệt nghỉ việc? Khi nào khóa truy cập? Có trường hợp tạm nghỉ khác nghỉ hẳn? Ai chịu trách nhiệm bàn giao lớp/thiết bị?

### WF-05 — Vòng đời lớp học và yêu cầu hủy/đóng/mở lại

- **[DOC] AS-IS:** Giáo vụ tạo/cập nhật lớp; hủy lớp có sinh viên phải gửi duyệt; lớp không còn sinh viên có thể hủy ngay; đóng lớp cần duyệt; mở lại lớp theo quyền; lưu trạng thái và lý do. [D1:L29; D2:L16–L17]
- **[PROPOSAL] Các kiểm tra cần đặc tả:** Số học viên hiện đăng ký, lịch đã xếp, giáo viên/phòng, học phí hoặc điểm danh phát sinh (nếu module tồn tại), ảnh hưởng tới các buổi học tương lai, thông báo tới giáo viên/học viên.
- **[PROPOSAL] Nhánh:** Tạo → kiểm tra điều kiện và lưu; yêu cầu hủy/đóng → xác định có cần duyệt → người có thẩm quyền duyệt/từ chối → cập nhật trạng thái và lịch liên quan → thông báo/audit. Mở lại → xác minh điều kiện mới, không mặc định mở lại lịch cũ.
- **[DECISION REQUIRED]** Khi nào bắt buộc duyệt, người duyệt trong trường hợp kiêm nhiệm, điều kiện mở lại, xử lý lớp có học viên nhưng chưa học buổi nào, hủy có hoàn/đổi lớp không.

### WF-06 — Xếp lịch, đổi lịch, điểm danh và xung đột tài nguyên

- **[DOC] Phần đã mô tả:** Giáo viên xem lịch/lớp được phân công; nghiệp vụ điểm danh, xin đổi lịch khi có quyền; nhóm lịch yêu cầu kiểm tra trùng phòng, giáo viên, sức chứa. [D1:L22, D1:L53; D2:L19, D2:L35]
- **[UNKNOWN]** Chưa có đầy đủ BPMN về tạo lịch lặp, hủy buổi, dạy bù, ngày nghỉ và mức ưu tiên giữa trường/trung tâm.
- **[PROPOSAL]** Mỗi yêu cầu đổi lịch phải kiểm tra quyền, xung đột phòng/giáo viên, người phê duyệt, lịch đã thông báo, xử lý điểm danh của buổi đã diễn ra; không tự tạo lịch mới khi chưa xác minh.
- **[DECISION REQUIRED]** Quyền cuối khi duyệt đổi lịch; quy tắc quá hạn; trường hợp phát sinh trùng do cập nhật đồng thời.

### WF-07 — Báo cáo và xử lý sự cố cơ sở vật chất

- **[DOC] AS-IS mức khái quát:** Nhân viên CSVC quản lý phòng/thiết bị, có quyền xem/xử lý sự cố; giáo viên có thể được cấp quyền báo sự cố. [D1:L23; D2:L18–L19]
- **[DEBATE]** Phần lớn các agent cho rằng chưa đủ luồng phân loại, phân công, xử lý, nghiệm thu; nhận định này hợp lý **trong phạm vi trích đoạn đã đọc**, không chứng minh toàn bộ tài liệu gốc thiếu.
- **[PROPOSAL] TO-BE ứng viên:** Người có quyền gửi báo cáo (địa điểm/thiết bị, mức độ, mô tả) → CSVC tiếp nhận/loại trùng → phân công người xử lý → cập nhật trạng thái và tài nguyên bị ảnh hưởng → giải quyết → xác nhận kết quả → đóng sự cố/audit. Nếu phòng bị ngừng sử dụng, liên kết tới lịch đã lên và thông báo người phụ trách.
- **[DECISION REQUIRED]** Ai phân loại mức khẩn; ai duyệt chi phí; ai nghiệm thu; khi nào khóa phòng; cách xử lý sự cố ảnh hưởng buổi học; quyền báo của giáo viên/học viên.

### WF-08 — Bật/tắt module Optional và bảo toàn dữ liệu

- **[DOC] AS-IS:** Owner được bật/tắt module Optional trong tổ chức; module lõi không được tắt; Super Admin có cơ chế khóa/ghi đè nền tảng. [D1:L42; D2:L35]
- **[DEBATE]** Tác động lên dữ liệu đã tạo và giao dịch đang chờ chưa được mô tả rõ trong phần trích xuất; AI đề xuất READ_ONLY/ARCHIVED nhưng đây không phải trạng thái đã chốt.
- **[PROPOSAL]** Trước khi tắt: hiển thị phụ thuộc và yêu cầu đang xử lý; nêu chính sách đọc dữ liệu cũ; kiểm tra quyền Owner và khóa nền tảng; cập nhật trạng thái module; ghi audit; bảo đảm không tự động xóa dữ liệu; có đường mở lại an toàn.
- **[DECISION REQUIRED]** Khi module tắt: chỉ khóa ghi, khóa cả đọc, hay lưu trữ? Các workflow dang dở xử lý ra sao? Bật lại khôi phục quyền và cấu hình nào?

## 6. KẾT QUẢ TRANH LUẬN: GIỮ, ĐIỀU CHỈNH, BÁC BỎ

| Nhận định AI | Phân loại lại | Cách xử lý trong bản v3 |
|---|---|---|
| “4 bước chuyển phòng, Employee duyệt là sai thực tế” | **CHƯA ĐỦ CƠ SỞ** | Giữ mô tả AS-IS; đưa hai phương án consent/acknowledgement ra quyết định |
| “Tổng quản lý không có quyền mặc định mâu thuẫn Owner” | **KHÔNG PHẢI MÂU THUẪN TỰ THÂN** | Tách chức danh Tổng quản lý và Quản trị viên tổ chức; giữ cơ chế Owner cấp quyền |
| “HR không được bổ nhiệm nhân sự” | **KHÁI QUÁT SAI** | HR có thể gán/thay đổi chức vụ trong phạm vi được cấp; bổ nhiệm Tổng quản lý vẫn thuộc Owner |
| “Owner tự thao tác là vi phạm” | **RỦI RO QUẢN TRỊ, KHÔNG MẶC NHIÊN LÀ LỖI** | Giữ ngoại lệ Owner và yêu cầu audit; xác định hành vi nhạy cảm cần kiểm soát bổ sung |
| “Thiếu xử lý khi vắng người duyệt” | **THIẾU CHI TIẾT THỰC THI** | Đã có chuỗi leo thang; chưa rõ điều kiện kích hoạt, chống tự duyệt, thời gian chờ |
| “Flow CSVC chưa đầy đủ” | **CÓ CƠ SỞ TRONG TRÍCH ĐOẠN** | Thêm flow ứng viên và danh sách yêu cầu cần chốt |
| “Tắt module không cần quản lý dữ liệu cũ” | **CHƯA CÓ QUY TẮC** | Đưa bảo toàn dữ liệu và workflow đang chờ vào quyết định |
| “Ma trận Tạo/Xem/Sửa/Xóa chung là đủ” | **KHÔNG PHÙ HỢP** | Yêu cầu matrix theo từng resource.action + scope + condition |
| “Quá 7 ngày không xác nhận thì tự từ chối chuyển phòng” | **ĐỀ XUẤT AI KHÔNG CÓ NGUỒN** | Không dùng làm business rule trước khi chốt SLA |
| “Hệ thống đã được đối chiếu thực tế” | **KHÔNG CHÍNH XÁC** | Không có SOP/phỏng vấn/tài liệu tham chiếu từ tổ chức thực tế |

## 7. NHẬT KÝ QUYẾT ĐỊNH CHỜ OWNER / NHÓM CHỐT

| ID | Câu hỏi cần quyết định | Lựa chọn hoặc phạm vi cần xác minh | Ưu tiên | Trạng thái |
|---|---|---|---|---|
| DEC-01 | Nhân viên có cần đồng ý điều chuyển không? | Đồng ý trước hiệu lực / chỉ nhận thông báo / theo loại yêu cầu | P0 | CHƯA CHỐT |
| DEC-02 | Ai khởi tạo và duyệt cuối luồng chuyển phòng? | HR, Trưởng phòng, nhân viên; giải quyết kiêm nhiệm | P0 | CHƯA CHỐT |
| DEC-03 | Chuyển phòng có giữ chức vụ và phân công cũ không? | Quy tắc thu hồi/bàn giao và ngày hiệu lực | P0 | CHƯA CHỐT |
| DEC-04 | HR được bổ nhiệm chức vụ đến cấp nào? | Scope tổ chức/phòng ban; ngoại lệ Tổng quản lý | P0 | CHƯA CHỐT |
| DEC-05 | Quản trị viên tổ chức khác Tổng quản lý ở những quyền nào? | Tách danh nghĩa, bundle, quyền nhạy cảm | P0 | CHƯA CHỐT |
| DEC-06 | Khi Owner vắng mặt/khóa tài khoản, xử lý ra sao? | Ủy quyền đã cấp / hỗ trợ nền tảng hạn chế / quy trình khẩn | P0 | CHƯA CHỐT |
| DEC-07 | Khi không có người duyệt, khi nào leo thang? | Điều kiện, người thay thế, thứ tự, SLA, audit | P1 | CHƯA CHỐT |
| DEC-08 | HR có được tự duyệt nghỉ việc do mình khởi tạo? | Tách người duyệt; ủy quyền; quyền Owner thao tác trực tiếp | P0 | CHƯA CHỐT |
| DEC-09 | Điều kiện hủy/đóng/mở lại lớp? | Học viên, lịch, trách nhiệm, dữ liệu lịch sử | P0 | CHƯA CHỐT |
| DEC-10 | Quy trình xử lý sự cố CSVC? | Phân công, nghiệm thu, mức độ khẩn, chi phí | P1 | CHƯA CHỐT |
| DEC-11 | Tắt module ảnh hưởng dữ liệu hiện có thế nào? | READ_ONLY / khóa truy cập / archive; workflow dang dở | P1 | CHƯA CHỐT |
| DEC-12 | Sự khác biệt trường học và trung tâm? | Thuật ngữ, tuyển sinh/ghi danh, điểm danh, lịch, thủ tục | P1 | CHƯA CHỐT |
| DEC-13 | Những chức năng Owner được thao tác trực tiếp? | Phạm vi ngoại lệ SoD, audit, thao tác không được bypass | P1 | CHƯA CHỐT |
| DEC-14 | Thời gian chờ xử lý, từ chối và thông báo? | Không mặc định 7 ngày hay auto-approve nếu chưa xác minh | P1 | CHƯA CHỐT |

**Nguyên tắc quản lý:** Chỉ chuyển `CHƯA CHỐT` sang `ĐÃ DUYỆT` khi có người ra quyết định, ngày và nội dung quyết định. Sau đó mới cập nhật flow, ma trận quyền, dữ liệu và use case liên quan. Không dùng “AI đồng thuận” để thay thế phê duyệt.

## 8. MA TRẬN QUYỀN MẪU THEO ĐỐI TƯỢNG (CẦN XÁC MINH)

| Mã hành động gợi ý | Actor thực hiện theo tài liệu | Phạm vi/điều kiện cần ghi | Trạng thái |
|---|---|---|---|
| organization.approve / reject | Super Admin | PLATFORM; kiểm tra hồ sơ tổ chức | DOC + chi tiết UNKNOWN |
| organization.suspend / reactivate | Super Admin | PLATFORM; lý do/audit | DOC + chi tiết UNKNOWN |
| department.create / update / delete | Owner; HR chỉ nếu có quyền tương ứng | ORGANIZATION/DEPARTMENT | Owner DOC; HR cần matrix chi tiết |
| employee.create / update / deactivate | Owner; HR có quyền trong scope | ORGANIZATION/DEPARTMENT | DOC; chi tiết phê duyệt UNKNOWN |
| position.assign | Owner; HR có quyền | Chức vụ, tổ chức, phòng ban, thời hạn | DOC; giới hạn cấp bổ nhiệm cần chốt |
| general_manager.appoint / dismiss | Owner | Trong tổ chức của Owner | DOC |
| delegation.grant / revoke | Owner | Quyền, scope, hiệu lực, không ủy quyền tiếp | DOC |
| class.create / update | Giáo vụ; Owner có quyền quản trị tổ chức | Theo module/phạm vi | DOC |
| class.close.request / approve | Giáo vụ gửi; Trưởng phòng có quyền duyệt | Không tự duyệt; trạng thái lớp | DOC; ngoại lệ chờ chốt |
| class.cancel.request / approve | Giáo vụ gửi; Trưởng phòng có quyền duyệt nếu lớp có học viên | Số học viên; lịch liên quan | DOC; chi tiết chờ chốt |
| schedule.change.request / approve | Giáo viên có quyền gửi; Trưởng phòng duyệt khi được cấp quyền | Buổi học, phòng, giáo viên | DOC mức khái quát |
| facility.issue.report / resolve | Giáo viên nếu được cấp; nhân viên CSVC theo quyền | Thiết bị/phòng trong tổ chức | DOC mức khái quát |
| module.toggle | Owner | Optional; không được tắt module lõi | DOC |
| student.self_view / schedule.self_view | Sinh viên/học viên | SELF: chỉ dữ liệu bản thân | DOC |

**Không gán quyền mặc định** cho một actor nếu phần nguồn chưa xác nhận. Mã hành động ở cột đầu là **tên gợi ý phục vụ lập bảng**, không được mặc định trùng permission code hiện có trong dự án.

## 9. TIÊU CHÍ NGHIỆM THU NGHIỆP VỤ (DỰ THẢO TEST/UAT)

Những kịch bản này là **đề xuất kiểm thử**; chỉ chuyển thành acceptance criteria chính thức sau khi phê duyệt các quyết định liên quan.

1. **Tổ chức:** Tài khoản thuộc tổ chức A không xem/sửa dữ liệu nghiệp vụ của tổ chức B chỉ bằng cách thay ID trong URL/request.
2. **Ủy quyền:** Khi quyền được thu hồi hoặc hết hạn, Tổng quản lý không còn thực hiện được hành động tương ứng.
3. **Không tự duyệt:** Người tạo yêu cầu không thể duyệt chính yêu cầu đó dù có nhiều chức vụ.
4. **Chuyển phòng:** Sau khi hoàn tất, nhân viên chỉ thuộc một phòng ban; phân công và chức vụ có xử lý nhất quán với chính sách đã chốt.
5. **Chuyển phòng bị từ chối:** Không thay phòng ban; lưu người từ chối, lý do, thời điểm; có thông báo phù hợp.
6. **Nghỉ việc:** Người đã offboard không giữ quyền đang hiệu lực; phân công lớp/thiết bị và lịch sử được xử lý đúng chính sách.
7. **Lớp học:** Hủy lớp có học viên phải đi theo nhánh phê duyệt; kiểm tra tình huống không còn học viên và lịch đã phát sinh.
8. **Lịch học:** Không xếp trùng cùng giáo viên/phòng hoặc vượt sức chứa theo quy tắc được chọn.
9. **Module Optional:** Tắt module không làm mất dữ liệu lịch sử ngoài ý muốn; không tắt được module được xác định là lõi.
10. **Quản lý sự cố:** Sự cố có actor báo, người xử lý, kết quả và điều kiện đóng hồ sơ sau khi quy trình được chốt.
11. **Phạm vi HR:** HR được cấp quyền tổ chức có thể thao tác ở nhiều phòng trong cùng tổ chức nhưng không vượt sang tổ chức khác.
12. **Theo dõi thay đổi:** Mọi thao tác nhạy cảm (phê duyệt, cấp/thu hồi quyền, Owner override) có audit theo chính sách được duyệt.

## 10. CÁC VIỆC PHẢI LÀM TRƯỚC KHI CHỐT ĐẶC TẢ

1. **Đọc đủ tài liệu gốc:** Chia D1 657 dòng và D2 1.106 dòng thành các phần theo flow. Lần review vừa rồi mới bao phủ 83 và 168 dòng; đặc biệt phải đọc mục 11–18 của D1.
2. **Tách AS-IS khỏi TO-BE:** Mỗi flow có hai phần rõ ràng. Nếu chưa có SOP từ cơ sở giáo dục thì AS-IS chỉ có nghĩa “theo tài liệu MEMS hiện tại”, không có nghĩa “ngoài đời đang vận hành như vậy”.
3. **Đối chiếu thực tế:** Phỏng vấn tối thiểu một stakeholder có kinh nghiệm tại trường/trung tâm mục tiêu hoặc thu thập SOP phù hợp; lưu minh chứng và khác biệt. Không tuyên bố “chuẩn thực tế” nếu chưa có nguồn đối chiếu.
4. **Chốt DEC-01 đến DEC-14:** Ghi người quyết định, ngày, giải thích và tác động tới role/flow/module.
5. **Vẽ lại BPMN/use case:** Có nhánh đồng ý/từ chối/timeout/vắng người duyệt, trạng thái, đầu vào/đầu ra.
6. **Xuất matrix chi tiết:** Mỗi hàng là `resource.action`, cột là actor, scope, điều kiện, người cấp, người duyệt, audit.
7. **Đồng bộ với kỹ thuật:** Sau khi duyệt business flow mới cập nhật ERD, API, UI, test case và code; không đảo chiều suy ra nghiệp vụ chỉ từ code.
8. **Rà soát chất lượng đầu ra AI:** Loại câu tự mâu thuẫn, đề xuất bị ghi nhầm thành hiện trạng, sơ đồ Mermaid chưa đóng, các con số SLA không có nguồn.

## 11. TRUY VẾT KẾT QUẢ PHẢN BIỆN

| Nội dung | Nguồn đã thấy trong evidence | Tài liệu debate liên quan |
|---|---|---|
| Quy tắc nhiều chức vụ / một phòng ban | [D1:L26] | `debate(1).md`, vòng 1 BA |
| Quyền và ủy quyền Tổng quản lý | [D1:L18, D1:L35, D1:L80–L81] | `business-review.md`, `role-permission-matrix.md` |
| Quy trình chuyển phòng 4 bước | [D1:L31] | `proposed-flows.md`, `debate(1).md` |
| Nghỉ việc và offboarding | [D1:L33] | `debate(1).md` vòng 2 QA |
| Vòng đời lớp | [D1:L29], [D2:L16–L17] | `business-review.md`, `debate(1).md` |
| Module Optional và lõi | [D1:L42], [D2:L35] | `debate(1).md` vòng 1–3 |
| CSVC và quyền báo sự cố | [D1:L23], [D2:L18–L19] | `debate(1).md` vòng 2–3 |
| Hạn chế phạm vi AI | `coverage.json`: D1 83/657, D2 168/1106 | `state(1).json` |

**Ghi chú phê duyệt:** Trạng thái chung: `DRAFT / NOT APPROVED`. Người duyệt, ngày duyệt và phiên bản chuẩn sẽ được điền sau khi các quyết định ở mục 7 được chốt.
