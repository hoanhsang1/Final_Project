> ⚠️ **Snapshot thảo luận 16–18/11 — đối chiếu 2026-11-26.** Đây là câu hỏi/checklist,
> không phải quyết định cuối cùng. Phần đã chốt một phần 25/11 nằm ở
> `docs/scope-can-chot-xep-lich.md`; trạng thái hiện tại: `docs/trang-thai-hien-tai-2026-11-26.md`.
>
> **Đã chốt một phần 26/11 về phân gói khách hàng:** xem `docs/dinh-nghia-goi-khach-hang.md`
> (Gói chuẩn / Gói doanh nghiệp theo nhóm phòng ban). Các ô `[ ]` dưới đây vẫn giữ nguyên
> để phản ánh snapshot thảo luận; chỉ đối chiếu khi cần quyết định.

# Câu hỏi cần scope / làm rõ (thảo luận)

> Tài liệu tổng hợp từ buổi thảo luận (16–18/11/2026). Mục tiêu: chốt phạm vi giai đoạn hiện tại và các định nghĩa nền để không vướng khi mở rộng/thu phí sau. **Chưa phải quyết định cuối cùng** — dùng làm checklist để thảo luận và chốt dần.

## Bối cảnh tạm chốt (đang thảo luận)
- **Trọng tâm giai đoạn hiện tại:** Giáo dục + Quản lý thiết bị.
- **Khách hàng mục tiêu ban đầu:** trung tâm / trường phổ thông (ưu tiên mô hình một cơ sở).
- **Nhóm ngoài phạm vi self-serve (dự kiến):** tổ chức quy mô/độ phức tạp cao như đại học, cao đẳng, đa cơ sở hoặc nhu cầu đặc thù → xem xét **Gói doanh nghiệp (Enterprise)** (tư vấn/báo giá/xác nhận riêng).
- **Thứ tự dự kiến:** hoàn thiện Quản lý thiết bị trước, sau đó làm Payment/thu phí.
- **Lưu ý:** sau sáp nhập (sát nhập), một tổ chức có thể không chỉ còn một cơ sở — cần tính đến khi scope.

---

## 1. Phạm vi khách hàng & ranh giới gói

### 1.1 Gói chuẩn (Standard)
- [ ] Gói chuẩn phục vụ chính xác những **loại hình** nào? (trung tâm ngoại ngữ/tin học/kỹ năng, mầm non, tiểu học, THCS, THPT… hay một tập con?)
- [ ] Giả định vận hành của gói chuẩn là gì? (ví dụ: một đơn vị/cơ sở, quy mô tổ chức và thiết bị dưới ngưỡng nhất định)
- [ ] THCS/THPT: xếp mặc định vào gói chuẩn hay cần tiêu chí bổ sung? (vì quy mô có thể “lưng chừng”)

### 1.2 Gói doanh nghiệp (Enterprise)
- [ ] Những trường hợp nào **mặc định** thuộc/xem là Enterprise? (ví dụ: CĐ/ĐH, đa cơ sở, vượt ngưỡng quy mô…)
- [ ] Hành vi tiếp nhận khách Enterprise: tự đăng ký và dùng ngay, hay **đăng ký → liên hệ/tư vấn/duyệt → kích hoạt gói riêng**?
- [ ] Enterprise có được dùng bản sản phẩm giống gói chuẩn + giới hạn cao hơn, hay có thành phần triển khai/tùy chỉnh riêng?

### 1.3 Tiêu chí/trigger phân hạng (cần chốt yếu tố, có thể chốt ngưỡng sau)
- [ ] Phân hạng dựa trên **độ phức tạp tổ chức**, **độ phức tạp thiết bị/vận hành**, hay **cả hai**?
- [ ] **Tổ chức:** số phòng ban/đơn vị, số vai trò/chức vụ, số người dùng/tài khoản, số cấp phân quyền, đa cơ sở hay không.
- [ ] **Thiết bị/vận hành:** số lượng thiết bị/tài sản, số phòng/lab/xưởng, tần suất mượn–trả/bảo trì/sửa chữa, yêu cầu theo dõi/quy trình phê duyệt.
- [ ] **Đào tạo (bổ sung nếu cần):** số lớp/học viên, số chương trình.
- [ ] **Loại hình:** dùng loại hình làm gợi ý/mặc định (CĐ/ĐH → Enterprise) kết hợp ngưỡng, hay chỉ dùng ngưỡng?
- [ ] Có cần cơ chế **vượt ngưỡng → nâng gói/Enterprise** dù loại hình ban đầu thuộc nhóm chuẩn không?

---

## 2. Định nghĩa “cơ sở” (site/campus) và đa cơ sở

- [ ] “Một cơ sở” được hiểu là **một địa điểm vật lý**, hay **một đơn vị quản lý/tổ chức pháp nhân** (có thể gồm nhiều địa điểm)?
- [ ] Giai đoạn hiện tại hệ thống **hỗ trợ hay không hỗ trợ** mô hình đa cơ sở? Nếu không, đa cơ sở được xem là ngoài scope/trigger Enterprise như thế nào?
- [ ] Nếu (tương lai) hỗ trợ đa cơ sở: cần tách dữ liệu theo cơ sở, phân quyền theo cơ sở, và/hoặc báo cáo tổng hợp ra sao? (ghi nhận để không chặn đường thiết kế)
- [ ] **Sau sáp nhập:** tổ chức từ một cơ sở thành nhiều cơ sở (hoặc ngược lại) được xử lý thế nào về mặt hạng/gói và dữ liệu?
- [ ] “Chi nhánh/cơ sở” trong cùng một tổ chức có được quản lý chung một tenant/tổ chức hay tách riêng? (ảnh hưởng tới cách hiểu đăng ký và phân hạng)

---

## 3. Phạm vi chức năng — Giáo dục (giai đoạn hiện tại)

- [ ] Nghiệp vụ **tối thiểu** (MVP) cho trung tâm/trường phổ thông trong mảng Giáo dục gồm gì? (ví dụ: quản lý lớp, học viên, giáo viên/nhân sự giảng dạy, lịch/thời khóa biểu… — cần liệt kê cụ thể)
- [ ] Mức độ sâu của từng nghiệp vụ trong gói chuẩn là gì?
- [ ] Những nghiệp vụ **không làm** ở giai đoạn này (non-goals): ví dụ đào tạo tín chỉ, quản lý khoa–viện/bộ môn kiểu đại học, quy trình học thuật phức tạp, đa cơ sở đào tạo…
- [ ] Ranh giới giữa dữ liệu/quy trình “giáo dục phổ thông/trung tâm” và mô hình CĐ/ĐH cần nêu rõ ở đâu?

---

## 4. Phạm vi chức năng — Quản lý thiết bị (giai đoạn hiện tại)

- [ ] Phạm vi **chuẩn** bao gồm những gì? (gợi ý cần chốt: danh mục/tài sản, vị trí/phòng, cấp phát/mượn–trả, theo dõi trạng thái, bảo trì/sửa chữa, lịch sử…)
- [ ] Nhu cầu nào xem là **nâng cao/Enterprise** hoặc để sau? (gợi ý: đa kho/đa cơ sở, quy trình phê duyệt nhiều cấp phức tạp, kiểm kê quy mô lớn, tích hợp chuyên sâu, tùy biến quy trình đặc thù…)
- [ ] Có cần phân biệt theo mức độ “tải thiết bị” (số lượng/loại thiết bị, lab/xưởng) để làm trigger gói không?
- [ ] Thiết bị gắn với cơ sở/phòng ban như thế nào trong gói chuẩn (một cơ sở)?

---

## 5. Xác định hạng/gói khi đăng ký (onboarding) & vận hành

- [ ] **Thời điểm biết hạng:** ngay khi đăng ký, sau khi duyệt tổ chức, hay sau bước tư vấn (đặc biệt với Enterprise)?
- [ ] **Nguồn thông tin:** tự khai hồ sơ (loại hình, quy mô, số cơ sở/phòng ban/thiết bị…), hệ thống gợi ý/tự phân hạng, hay quản trị viên xác nhận thủ công?
- [ ] Có bước **xác nhận/xác minh** riêng cho Enterprise không? Ai chịu trách nhiệm chốt?
- [ ] **Luồng đăng ký đề xuất (cần chốt):** khai báo → gợi ý/áp hạng sơ bộ → (chuẩn) kích hoạt / (Enterprise) chuyển nhánh liên hệ–tư vấn–báo giá–kích hoạt?
- [ ] **Khi thay đổi sau này:** tổ chức vượt ngưỡng, thêm cơ sở, hoặc sáp nhập thì xử lý ra sao? (giữ nguyên, cảnh báo, giới hạn tính năng mới, yêu cầu nâng gói, tái đánh giá hạng)
- [ ] **Thuật ngữ thống nhất:** dùng “Gói chuẩn” và “Gói doanh nghiệp (Enterprise)” (hoặc tên khác)? Tránh trộn nhiều cách gọi.

---

## 6. Payment / thu phí (làm sau, nhưng cần móc khái niệm)

- [ ] Mô hình thu phí dự kiến: theo gói (tier), theo giới hạn/quota (người dùng, thiết bị, cơ sở…), theo module, hay kết hợp?
- [ ] Những “điểm móc” cần giữ sẵn trong thiết kế nghiệp vụ/dữ liệu (dù chưa triển khai): khái niệm gói/hạng, giới hạn tài nguyên, module/tính năng thuộc gói, trạng thái gói/hết hạn.
- [ ] Hành vi khi **hết hạn, vượt hạn, hoặc hạ/nâng gói** mong muốn là gì? (chỉ ghi nhận định hướng để không chặn đường)
- [ ] Enterprise: định giá/báo giá riêng và điều khoản riêng có trong phạm vi hệ thống tự động hay xử lý ngoài luồng?

---

## 7. Ngoài phạm vi tạm thời (non-goals) — cần ghi rõ để tránh trôi scope

- [ ] Không phục vụ như mục tiêu self-serve: đại học/cao đẳng, mô hình đa cơ sở phức tạp, cấu trúc khoa–viện/phân quyền nhiều tầng kiểu bậc cao (trừ khi đi theo nhánh Enterprise).
- [ ] Không triển khai cơ chế tính phí/payment trong giai đoạn hiện tại (chỉ chuẩn bị khái niệm/hạng).
- [ ] Các loại hình/tình huống nào khác cần liệt kê rõ là “chưa hỗ trợ”?

---

## 8. Ưu tiên chốt trước (đề xuất)

Nếu cần rút gọn để thống nhất nhanh, nên chốt trước các điểm có tác động lan rộng nhất:
1. **Định nghĩa “cơ sở”** và hệ thống có coi/hỗ trợ đa cơ sở trong gói chuẩn hay không (kể cả kịch bản sáp nhập).
2. **Bộ tiêu chí/trigger** phân hạng Gói chuẩn vs Enterprise (tổ chức, thiết bị, hoặc cả hai) — ít nhất ở mức định tính.
3. **Ranh giới chức năng Giáo dục & Quản lý thiết bị** cho gói chuẩn (làm gì / không làm gì).
4. **Cách xác định hạng khi đăng ký/onboarding** (tự khai + gợi ý/tự gán, có bước duyệt/xác nhận Enterprise hay không).

---

## Ghi chú
- Tài liệu này phản ánh nội dung thảo luận, chưa thay thế quyết định sản phẩm/chính sách chính thức.
- Khi chốt được câu trả lời, nên cập nhật từng mục `[ ]` → `[x]` kèm quyết định và ngày/người chốt (nếu cần).
