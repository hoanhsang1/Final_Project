export interface PlannedContent {
  summary: string
  steps: string[]
  apis: string[]
  note?: string
}

/**
 * Nội dung cho các màn hình đã thiết kế nhưng chưa triển khai trong FE-00.
 * Mọi API ghi ở đây là API ĐÃ CÓ trong backend, trừ khi ghi rõ "PROPOSED".
 */
export const PLANNED_CONTENT: Record<string, PlannedContent> = {
  'org-pending': {
    summary:
      'Hàng chờ duyệt tổ chức đăng ký mới, kèm thông tin chủ sở hữu và module đề nghị. Đây là bước đầu tiên của vòng đời tổ chức.',
    steps: [
      'Danh sách tổ chức trạng thái chờ duyệt, sắp xếp theo thời gian gửi.',
      'Xem chi tiết hồ sơ: tên, loại hình, chủ sở hữu, module đề nghị.',
      'Duyệt hoặc từ chối kèm lý do bắt buộc (1–500 ký tự).',
      'Ghi nhật ký hệ thống cho mỗi quyết định.',
    ],
    apis: [
      'GET /api/v1/organizations/pending',
      'GET /api/v1/organizations/{id}',
      'PATCH /api/v1/organizations/{id}/approve',
      'PATCH /api/v1/organizations/{id}/reject',
    ],
    note: 'Backend hiện bỏ qua nội dung lý do từ chối khi lưu; giao diện vẫn bắt buộc nhập.',
  },
  'module-catalog': {
    summary:
      'Danh mục module toàn hệ thống: thêm, sửa, bật/tắt và đánh dấu module lõi. Module lõi không thể bị tắt ở cấp tổ chức.',
    steps: [
      'Bảng module kèm cờ lõi và số tổ chức đang dùng.',
      'Thêm / sửa tên, mô tả, trạng thái hoạt động.',
      'Chặn tắt module lõi và cảnh báo khi còn tổ chức đang dùng.',
    ],
    apis: ['GET /api/v1/modules', 'PROPOSED: POST/PATCH /api/v1/modules'],
    note: 'Danh mục hiện chỉ có API đọc công khai; thao tác ghi chưa có trong backend.',
  },
  accounts: {
    summary:
      'Quản lý tài khoản toàn hệ thống: tìm kiếm, đổi trạng thái, đổi vai trò và đặt lại mật khẩu.',
    steps: [
      'Bảng tài khoản lọc theo tổ chức, vai trò, trạng thái.',
      'Đổi trạng thái active / locked / disabled kèm lý do.',
      'Đổi vai trò (không thể cấp SUPER_ADMIN).',
      'Đặt lại mật khẩu và yêu cầu đổi ở lần đăng nhập kế tiếp.',
    ],
    apis: [
      'GET /api/v1/accounts',
      'GET /api/v1/accounts/{id}',
      'PATCH /api/v1/accounts/{id}/status',
      'PATCH /api/v1/accounts/{id}/role',
      'POST /api/v1/accounts/{id}/reset-password',
    ],
    note: 'Backend không trả mật khẩu tạm khi reset; cần bổ sung kênh gửi email trước khi dùng thực tế.',
  },
  'platform-audit': {
    summary:
      'Nhật ký thao tác toàn hệ thống theo tổ chức, tài khoản và loại hành động.',
    steps: [
      'Bộ lọc theo hành động, tổ chức, khoảng ngày, từ khoá.',
      'Bảng có phân trang, cột người thực hiện và đối tượng.',
      'Xuất dữ liệu phục vụ kiểm toán (đề xuất).',
    ],
    apis: ['GET /api/v1/audit-logs'],
  },
  positions: {
    summary:
      'Chức vụ là khuôn mẫu quyền: gồm bundle + quyền chi tiết + phạm vi ORGANIZATION/DEPARTMENT. Một người có thể giữ nhiều chức vụ.',
    steps: [
      'Danh sách chức vụ, phạm vi, số người đang giữ.',
      'Tạo/sửa chức vụ: chọn bundle, chọn quyền trong module đang bật.',
      'Xem tác động trước khi xoá, chặn xoá khi đang được gán.',
      'Nhân bản chức vụ sang phòng ban khác.',
    ],
    apis: [
      'GET /positions',
      'GET /permissions',
      'GET /permission-bundles',
      'POST/PUT/DELETE /positions',
      'GET /positions/{id}/impact',
      'POST /positions/{id}/clone',
    ],
  },
  transfers: {
    summary:
      'Điều chuyển phòng ban theo quy trình bốn bên: Trưởng phòng cũ → Trưởng phòng mới → Nhân sự → Nhân viên xác nhận.',
    steps: [
      'Danh sách yêu cầu kèm bước hiện tại và người có thể duyệt.',
      'Tạo yêu cầu: chọn nhân sự, phòng ban đích, lý do.',
      'Duyệt/từ chối đúng bước của mình, kèm ghi chú.',
      'Hiển thị tiến trình bốn bước và kết quả áp dụng.',
    ],
    apis: [
      'GET /transfer-requests/inbox',
      'GET /transfer-requests/mine',
      'POST /transfer-requests',
      'POST /transfer-requests/{id}/steps/{step}/approve|reject',
      'POST /transfer-requests/{id}/cancel',
    ],
  },
  delegations: {
    summary:
      'Bổ nhiệm Tổng quản lý và cấp quyền có thời hạn cho người đó. Chức danh không tự kèm quyền.',
    steps: [
      'Danh sách Tổng quản lý đang được bổ nhiệm.',
      'Tạo ủy quyền: chọn tập quyền ⊆ quyền của Owner, thời hạn.',
      'Sửa / thu hồi kèm lý do, ghi nhật ký.',
      'Tổng quản lý xem quyền của mình tại trang cá nhân.',
    ],
    apis: [
      'GET /api/general-manager',
      'POST /api/general-manager',
      'GET /api/delegations',
      'POST /api/delegations',
      'POST /api/delegations/{id}/revoke',
    ],
  },
  'org-modules': {
    summary:
      'Chủ tổ chức bật/tắt module tùy chọn. Module lõi không tắt được; tắt module chuyển sang chỉ đọc.',
    steps: [
      'Danh sách module kèm trạng thái và cờ lõi.',
      'Bật/tắt module tùy chọn, chặn tắt khi còn yêu cầu đang chờ.',
      'Hiển thị module bị quản trị hệ thống khoá.',
    ],
    apis: ['GET /api/v1/modules', 'PUT /api/v1/organizations/{id}/modules'],
    note: 'API bật/tắt hiện chỉ dành cho SUPER_ADMIN; OWNER cần endpoint riêng (org.module.toggle).',
  },
  'org-audit': {
    summary: 'Nhật ký thay đổi cấp tổ chức: chức vụ, nhân sự, điều chuyển, module.',
    steps: ['Bộ lọc theo hành động và khoảng ngày.', 'Chi tiết từng thay đổi kèm người thực hiện.'],
    apis: ['PROPOSED: GET /api/v1/organizations/{id}/audit-logs'],
    note: 'Backend chưa có endpoint đọc nhật ký cấp tổ chức.',
  },
  teachers: {
    summary: 'Hồ sơ giáo viên: chuyên môn, hợp đồng, trạng thái giảng dạy và lớp được phân công.',
    steps: [
      'Danh sách giáo viên lọc theo chuyên môn và trạng thái dạy.',
      'Tạo hồ sơ giáo viên kèm tài khoản và mật khẩu tạm.',
      'Đổi trạng thái đang dạy / tạm nghỉ / nghỉ việc.',
      'Phân công lại lớp khi giáo viên nghỉ.',
    ],
    apis: ['GET /api/teachers', 'POST /api/teachers', 'PUT /api/teachers/{id}', 'GET /api/teachers/assignable'],
  },
  students: {
    summary: 'Hồ sơ sinh viên, trạng thái học tập và cấp tài khoản đăng nhập.',
    steps: [
      'Danh sách sinh viên lọc theo lớp và trạng thái.',
      'Tạo hồ sơ, cấp tài khoản với mật khẩu tạm.',
      'Đổi trạng thái: đang học / bảo lưu / thôi học / tốt nghiệp.',
      'Xem lớp đang học và chuyên cần.',
    ],
    apis: ['GET /students', 'POST /students', 'POST /students/{id}/account', 'PUT /students/{id}'],
  },
  subjects: {
    summary: 'Danh mục môn học dùng để gán lớp và đối chiếu chuyên môn giáo viên.',
    steps: ['Danh sách môn học.', 'Tạo/sửa môn.', 'Vô hiệu hoá môn đang được dùng thay vì xoá.'],
    apis: ['GET /api/subjects', 'PROPOSED: POST/PUT /subjects'],
  },
  classes: {
    summary:
      'Vòng đời lớp học: trạng thái tự tính theo ngày, yêu cầu huỷ/đóng lớp và phân công giáo viên.',
    steps: [
      'Danh sách lớp kèm trạng thái và cờ cần phân công lại.',
      'Chi tiết lớp: giáo viên, sĩ số, lịch sử trạng thái.',
      'Gửi yêu cầu huỷ/đóng lớp; người duyệt theo leo thang.',
      'Gán / phân công lại giáo viên đang dạy và đúng chuyên môn.',
    ],
    apis: ['GET /api/classes', 'POST /api/classes', 'PUT /api/classes/{id}/teacher', 'POST /api/classes/{id}/close-requests'],
  },
  schedule: {
    summary: 'Lịch dạy theo tuần/tháng, lọc theo lớp, giáo viên và phòng; chặn cứng khi trùng lịch.',
    steps: [
      'Lịch tuần/tháng với bộ lọc lớp, giáo viên, phòng.',
      'Tạo buổi học, kiểm tra trùng giáo viên/phòng/lớp.',
      'Gợi ý phòng trống theo khung giờ.',
      'Xếp lịch lặp có xem trước từng buổi.',
    ],
    apis: [
      'GET /api/departments/{id}/schedules',
      'POST /api/departments/{id}/schedules',
      'GET /api/departments/{id}/schedules/room-suggestions',
    ],
  },
  attendance: {
    summary: 'Điểm danh buổi học của giáo viên được phân công và báo cáo chuyên cần.',
    steps: ['Chọn buổi học trong lịch của tôi.', 'Điểm danh có mặt / vắng / trễ kèm ghi chú.', 'Xem báo cáo chuyên cần theo lớp.'],
    apis: ['PROPOSED: POST /api/sessions/{id}/attendance'],
  },
  'change-requests': {
    summary: 'Giáo viên gửi yêu cầu đổi lịch / dạy bù / nghỉ; duyệt theo leo thang.',
    steps: ['Gửi yêu cầu kèm lý do bắt buộc.', 'Người duyệt thấy trong hộp việc chờ.', 'Duyệt thì đổi lịch, từ chối thì giữ nguyên.'],
    apis: ['PROPOSED: POST /api/schedule-change-requests'],
  },
  facility: {
    summary: 'Phòng học và thiết bị là tài nguyên cấp tổ chức, do phòng CSVC quản lý.',
    steps: ['Danh sách phòng theo trạng thái.', 'Thêm/sửa/xoá phòng và thiết bị.', 'Xem thiết bị hỏng theo phòng.'],
    apis: [
      'GET /api/departments/{id}/facilities/rooms',
      'GET /api/departments/{id}/facilities/equipment',
    ],
  },
  'facility-issues': {
    summary: 'Báo cáo và xử lý sự cố thiết bị, có mức độ và ảnh hưởng tới lịch học.',
    steps: ['Báo sự cố thiết bị kèm mô tả.', 'CSVC phân loại mức độ và xử lý.', 'Liệt kê buổi học bị ảnh hưởng.'],
    apis: ['GET /api/departments/{id}/facilities/issues', 'POST /api/departments/{id}/facilities/issues'],
  },
  'approvals-inbox': {
    summary: 'Hợp nhất các yêu cầu đang chờ chính bạn duyệt: điều chuyển, huỷ/đóng lớp, đổi lịch.',
    steps: ['Danh sách chỉ gồm việc bạn có quyền quyết.', 'Duyệt/từ chối ngay trong danh sách.', 'Xong thì biến khỏi hộp.'],
    apis: ['GET /transfer-requests/inbox', 'PROPOSED: GET /approvals/inbox'],
  },
  notifications: {
    summary: 'Hộp thông báo trong hệ thống, đánh dấu đã đọc và điều hướng tới đối tượng liên quan.',
    steps: ['Danh sách mới nhất trước.', 'Đánh dấu đã đọc / đọc tất cả.', 'Mở đối tượng liên quan.'],
    apis: ['GET /notifications', 'POST /notifications/{id}/read', 'POST /notifications/read-all'],
  },
  'my-schedule': {
    summary: 'Lịch dạy/học của chính người đăng nhập, chỉ dùng id trong JWT.',
    steps: ['Chọn khoảng ngày.', 'Xem buổi học theo tuần.', 'Mở chi tiết buổi học.'],
    apis: ['GET /api/schedules/me'],
  },
  'student-portal': {
    summary: 'Cổng sinh viên: hồ sơ, lớp đang học, lịch và chuyên cần của chính mình.',
    steps: ['Xem hồ sơ cá nhân.', 'Xem lớp đang học.', 'Xem lịch và chuyên cần.'],
    apis: ['GET /students/me', 'GET /students/me/classes', 'GET /api/schedules/me'],
  },
  'my-delegations': {
    summary: 'Danh sách quyền đang được ủy quyền và thời hạn hiệu lực.',
    steps: ['Xem quyền được nhận.', 'Xem thời hạn và người ủy quyền.'],
    apis: ['GET /api/delegations/me'],
  },
}
