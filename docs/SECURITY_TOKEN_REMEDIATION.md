# Báo cáo xử lý JWT bị commit vào repository

Ngày: 2026-11-17 · Nhánh: `fixFlowCreateEmployee` · HEAD khi kiểm tra: `fe18018e6ac26536b9550252985cb4dc3d0c443c`

Trạng thái tổng: `SOURCE_FIXED` (đã ngăn tái diễn trong source) + `LIVE_PENDING` (thu hồi token/rotating key cần người vận hành thực hiện).

## 1. Phát hiện

8 tệp token E2E đang được Git theo dõi:

| Tệp | Đối tượng |
| --- | --- |
| `.e2e_tmp/tok_platform_admin.txt` | Quản trị hệ thống (SUPER_ADMIN) |
| `.e2e_tmp/tok_sample_owner.txt` | Chủ tổ chức |
| `.e2e_tmp/tok_sample_academic.txt` | Giáo vụ |
| `.e2e_tmp/tok_sample_head.txt` | Trưởng phòng ban |
| `.e2e_tmp/tok_sample_hr.txt` | Nhân sự phòng ban |
| `.e2e_tmp/tok_sample_teacher.txt` | Giáo viên |
| `.e2e_tmp/tok_sample_teacher2.txt` | Giáo viên thứ hai |
| `.e2e_tmp/tok_student.txt` | Sinh viên |

Không mở/không in nội dung token trong quá trình xử lý. Các đánh giá dưới đây dựa trên tên tệp và ngữ cảnh sử dụng (script E2E tạo token bằng đăng nhập thật).

## 2. Lịch sử commit và mức độ phơi nhiễm

- Commit duy nhất thêm các tệp: `fe18018` (`fixUITeacher`, 2026-11-17) — cũng là HEAD hiện tại.
- Commit này **đã được đẩy lên remote**: nhánh `origin/fixFlowCreateEmployee` trỏ đúng `fe18018`.
- Hệ quả: token nằm trong lịch sử Git trên GitHub, không chỉ ở máy local. Xoá tệp ở commit mới **không** làm token biến mất khỏi lịch sử.
- Token là JWT HS256 do IdentityService cấp; dịch vụ xác thực stateless bằng `JWT_SECRET_BASE64`, không kiểm tra trạng thái thu hồi theo từng access token. Vì vậy access token còn hạn vẫn dùng được cho tới khi hết hạn hoặc khoá ký bị đổi.

## 3. Thay đổi đã thực hiện trong source

1. `.gitignore`: thêm `.e2e_tmp/`.
2. Bỏ theo dõi 8 tệp token, giữ nguyên bản local để chạy E2E:

```bash
git rm -r --cached .e2e_tmp
```

Kết quả `git status`: 8 dòng `D` (staged deletion) + `.gitignore` modified. **Chưa commit, chưa push** theo yêu cầu của đề bài.

Sau khi người vận hành commit, repository sẽ không còn theo dõi token ở các commit mới; token vẫn tồn tại trong lịch sử cũ.

## 4. Hướng dẫn thu hồi (người vận hành thực hiện)

### 4.1. Thu hồi refresh token của các tài khoản liên quan

Gọi logout cho từng tài khoản bằng refresh token tương ứng (không in token ra terminal):

```bash
# Ví dụ, thay <REFRESH_TOKEN> bằng nội dung tệp .e2e_tmp/tok_*.txt nếu tệp chứa refresh token,
# hoặc đăng nhập lại rồi logout ngay.
curl -X POST https://<gateway-host>/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  --data-binary @payload.json   # {"refreshToken":"..."}
```

Nếu không chắc tệp chứa access hay refresh token, cách chắc chắn nhất là **đổi mật khẩu** các tài khoản test: `PasswordChangeService` thu hồi toàn bộ refresh token còn hiệu lực của tài khoản.

### 4.2. Vô hiệu access token đang lưu hành

Access token không bị thu hồi theo cá nhân. Hai lựa chọn:

- **Chờ hết hạn** (an toàn nhưng phụ thuộc thời gian sống token đã cấu hình).
- **Xoay khoá ký JWT** (khuyến nghị nếu không xác định được thời điểm hết hạn): đổi `JWT_SECRET_BASE64` cho **tất cả** dịch vụ xác thực token: Identity, People, Schedule, Facility, Gateway (và bất kỳ dịch vụ nào dùng `jwt.secret-base64`). Việc này đăng xuất toàn hệ thống.

Quy trình xoay khoá (chưa thực hiện, cần người vận hành):

1. Sinh khoá mới ≥ 32 byte, mã hoá base64.
2. Cập nhật secret trong file môi trường/secret store của deploy (không sửa `vercel.json`).
3. Khởi động lại lần lượt Identity → People → Schedule → Facility → Gateway.
4. Kiểm tra đăng nhập mới thành công; token cũ phải trả 401.

> Không tự động xoay khoá trong phiên này vì sẽ đăng xuất toàn bộ người dùng đang phục vụ.

### 4.3. Dọn lịch sử Git (tuỳ chọn, cần quyết định của nhóm)

- Cách tối thiểu: commit việc xoá tệp + `.gitignore`, sau đó thu hồi/xoay khoá như trên.
- Cách triệt để: viết lại lịch sử (`git filter-repo`/BFG) để xoá `.e2e_tmp` khỏi mọi commit, sau đó **force push** — thao tác phá huỷ, ảnh hưởng mọi người dùng nhánh. Đề bài cấm thực hiện trong phiên này; chỉ ghi nhận như lựa chọn.

## 5. Phòng tái diễn

- `.e2e_tmp/` đã nằm trong `.gitignore`.
- Khuyến nghị thêm kiểm tra trước commit: `gitleaks detect` hoặc `git secrets --scan`, và chặn CI khi phát hiện chuỗi giống JWT (`eyJ` + 2 dấu chấm).
- Script E2E nên ghi token vào thư mục tạm ngoài repo hoặc biến môi trường phiên, và xoá sau khi chạy.

## 6. Việc cần người dùng làm

- [ ] Commit + push thay đổi `.gitignore` và việc bỏ theo dõi `.e2e_tmp` (phiên này không commit theo yêu cầu).
- [ ] Thu hồi refresh token/đổi mật khẩu 8 tài khoản test ở trên.
- [ ] Quyết định xoay `JWT_SECRET_BASE64` (khuyến nghị) và thực hiện theo mục 4.2.
- [ ] Quyết định có viết lại lịch sử Git hay không (mục 4.3).
- [ ] Xoá các tệp `.e2e_tmp/*` local sau khi thu hồi.

## 7. Bằng chứng trong phiên

- `git ls-files` trước khi xử lý: 8 tệp `.e2e_tmp/*.txt`.
- `git log --diff-filter=A -- .e2e_tmp`: chỉ commit `fe18018`.
- `git branch -r --contains fe18018`: `origin/fixFlowCreateEmployee`.
- Sau `git rm -r --cached`: `git status --short .e2e_tmp` hiển thị 8 dòng `D ` (đã stage), tệp vẫn còn trên đĩa.
