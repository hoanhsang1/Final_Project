# -*- coding: utf-8 -*-
"""Generate the MEMS role/function map as an editable multi-page .drawio file."""
from xml.sax.saxutils import escape
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "docs" / "MEMS_so_do_chuc_nang_theo_vai_tro.drawio"

C_BLUE = "#1677FF"
C_ORANGE = "#FA8C16"
C_GREEN = "#52C41A"
C_PURPLE = "#722ED1"
C_RED = "#CF1322"
C_GRAY = "#8C8C8C"

F_PLATFORM = "#E6F4FF"
F_ORG = "#FFF7E6"
F_DEPT = "#F6FFED"
F_SELF = "#F9F0FF"
F_NOTE = "#FFFBE6"
F_HEADER = "#1F2937"


def esc(text: str) -> str:
    return escape(text, {'"': "&quot;"}).replace("\n", "&lt;br&gt;")


class Page:
    def __init__(self, pid, name, width, height):
        self.pid = pid
        self.name = name
        self.width = width
        self.height = height
        self.cells = []
        self.n = 0

    def nid(self, prefix="n"):
        self.n += 1
        return f"{self.pid}-{prefix}{self.n}"

    def node(self, text, x, y, w, h, style, cid=None):
        cid = cid or self.nid()
        self.cells.append(
            f'<mxCell id="{cid}" value="{esc(text)}" style="{style}" vertex="1" parent="1">'
            f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>'
        )
        return cid

    def edge(self, src, dst, text="", style="", dashed=False, label_dy=None):
        eid = self.nid("e")
        s = "edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;endSize=8;strokeWidth=2;strokeColor=#595959;fontSize=10;labelBackgroundColor=#FFFFFF;"
        if dashed:
            s += "dashed=1;"
        s += style
        geom = (
            f'<mxGeometry relative="1" as="geometry"><mxPoint x="0" y="{label_dy}" as="offset"/></mxGeometry>'
            if label_dy is not None
            else '<mxGeometry relative="1" as="geometry"/>'
        )
        self.cells.append(
            f'<mxCell id="{eid}" value="{esc(text)}" style="{s}" edge="1" parent="1" source="{src}" target="{dst}">'
            f'{geom}</mxCell>'
        )
        return eid

    def xml(self):
        body = "\n        ".join(self.cells)
        return (
            f'  <diagram id="{self.pid}" name="{esc(self.name)}">\n'
            f'    <mxGraphModel dx="1600" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" '
            f'connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{self.width}" '
            f'pageHeight="{self.height}" math="0" shadow="0">\n'
            f'      <root>\n        <mxCell id="0"/>\n        <mxCell id="1" parent="0"/>\n'
            f'        {body}\n      </root>\n    </mxGraphModel>\n  </diagram>'
        )


TITLE = "text;html=1;fontSize=22;fontStyle=1;align=left;verticalAlign=middle;fontColor=#1F2937;"
SUB = "text;html=1;fontSize=12;align=left;verticalAlign=middle;fontColor=#595959;"
H2 = "text;html=1;fontSize=15;fontStyle=1;align=left;verticalAlign=middle;fontColor=#1F2937;"


def card_style(fill, stroke, font=11, bold=False):
    return (
        f"rounded=1;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};strokeWidth=1.5;"
        f"fontSize={font};align=left;verticalAlign=top;spacing=8;spacingTop=6;"
        + ("fontStyle=1;" if bold else "")
    )


def head_style(fill, stroke):
    return (
        f"rounded=1;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};strokeWidth=2;"
        "fontSize=14;fontStyle=1;align=center;verticalAlign=middle;fontColor=#FFFFFF;"
    )


def note_style(fill=F_NOTE, stroke="#D4B106"):
    return (
        f"rounded=1;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};strokeWidth=1;"
        "dashed=1;fontSize=11;align=left;verticalAlign=top;spacing=8;spacingTop=6;fontColor=#614700;"
    )


def flow_style(fill, stroke):
    return (
        f"rounded=1;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};strokeWidth=1.5;"
        "fontSize=11;align=center;verticalAlign=middle;spacing=4;"
    )


# ---------------------------------------------------------------------------
# PAGE 1 — Overview of roles, scopes and what each role can do
# ---------------------------------------------------------------------------
p1 = Page("p1", "1. Tổng quan vai trò & phạm vi", 1720, 1460)
p1.node("MEMS — BẢN ĐỒ CHỨC NĂNG THEO VAI TRÒ", 40, 16, 1640, 40, TITLE)
p1.node(
    "Nguồn sự thật: controller + @PreAuthorize/@RequirePermission, SQL phân quyền (10–26) và cấu hình chức vụ mặc định. "
    "Một tài khoản có thể có nhiều tầng: ROLE hệ thống + CHỨC VỤ (kèm bundle) + ỦY QUYỀN.",
    40, 58, 1640, 34, SUB,
)

cols = [
    (40, "TẦNG NỀN TẢNG — PLATFORM", F_PLATFORM, C_BLUE),
    (450, "TẦNG TỔ CHỨC — ORGANIZATION", F_ORG, C_ORANGE),
    (860, "TẦNG PHÒNG BAN — DEPARTMENT", F_DEPT, C_GREEN),
    (1270, "TẦNG CÁ NHÂN — SELF", F_SELF, C_PURPLE),
]
for x, label, fill, stroke in cols:
    p1.node(label, x, 112, 400, 48, head_style(stroke, stroke))
    p1.node("", x, 160, 400, 1080, f"rounded=1;fillColor={fill};strokeColor={stroke};strokeWidth=1;opacity=35;")

# Platform column
p1.node(
    "SUPER_ADMIN\n(Admin hệ thống — role nền tảng)\n\n"
    "• Duyệt / từ chối tổ chức đăng ký\n"
    "• Tạm ngưng / kích hoạt lại tổ chức\n"
    "• Bật/tắt module cho từng tổ chức\n"
    "• Xem danh mục module hệ thống\n"
    "• Xem danh sách & chi tiết tài khoản\n"
    "• Tạo tài khoản (không tạo SUPER_ADMIN)\n"
    "• Đổi trạng thái: active / locked / disabled\n"
    "• Đổi role tài khoản\n"
    "• Reset mật khẩu tài khoản\n"
    "• Xem nhật ký hệ thống (audit log)\n\n"
    "KHÔNG có nghiệp vụ phòng ban:\n"
    "không tạo lớp, không duyệt đơn,\n"
    "không dùng PeopleService.",
    60, 180, 360, 320, card_style("#FFFFFF", C_BLUE),
)
p1.node(
    "GIỚI HẠN CẦN NHỚ\n\n"
    "• /api/v1/organizations/**\n"
    "• /api/v1/accounts/**\n"
    "• /api/v1/audit-logs/**\n"
    "chỉ role SUPER_ADMIN được gọi.\n\n"
    "• Không có org_id → không tham gia\n"
    "luồng nghiệp vụ của tổ chức.",
    60, 515, 360, 205, note_style(),
)
p1.node(
    "CHÚ GIẢI\n\n"
    "✓  được phép theo thiết kế\n"
    "△  chỉ khi được cấp quyền / ủy quyền\n"
    "—  không có trong thiết kế\n\n"
    "ROLE   = vai trò đăng nhập (JWT)\n"
    "CHỨC VỤ = vị trí trong phòng ban,\n"
    "mang permission + bundle\n"
    "ỦY QUYỀN = Owner cấp quyền có thời hạn\n"
    "cho Tổng quản lý",
    60, 735, 360, 250, note_style(F_PLATFORM, C_BLUE),
)
p1.node(
    "ROLE CŨ / CHƯA CÓ MÀN HÌNH\n\n"
    "• ORG_ADMIN\n"
    "• ACADEMIC_STAFF\n"
    "• FACILITY_STAFF\n\n"
    "Vẫn còn trong seed & role_permission\n"
    "(đã migration sang mã mới) nhưng\n"
    "FE mapBackendRole trả null → không có\n"
    "console tương ứng. Dùng OWNER /\n"
    "MANAGER / STAFF + chức vụ thay thế.",
    60, 1000, 360, 185, note_style(F_NOTE, C_GRAY),
)

# Organization column
p1.node(
    "OWNER / ORG_OWNER\n(Chủ tổ chức)\n\n"
    "• Toàn quyền trong tổ chức — code bypass\n"
    "  bằng hasRole('OWNER') ở mọi controller\n"
    "• Phòng ban: xem / tạo / sửa / xóa\n"
    "• Xem tác động khi đổi module phòng ban\n"
    "• Chức vụ: xem / tạo / sửa / xóa / clone\n"
    "• Nhân sự: xem / tạo / sửa / xóa / reset MK\n"
    "• Gán & thay đổi chức vụ cho nhân sự\n"
    "• Bổ nhiệm / bãi nhiệm Tổng quản lý\n"
    "• Tạo / sửa / thu hồi ủy quyền\n"
    "• Dùng được toàn bộ khu Đào tạo",
    470, 180, 360, 280, card_style("#FFFFFF", C_ORANGE),
)
p1.node(
    "TỔNG QUẢN LÝ\n(chức danh — KHÔNG phải role)\n\n"
    "• Owner bổ nhiệm / bãi nhiệm\n"
    "• Chức danh 'Tổng quản lý' không kèm quyền\n"
    "• Chỉ làm được việc trong phạm vi quyền\n"
    "  được Owner ủy quyền (scope ORGANIZATION)\n"
    "• Ủy quyền có thời hạn, có thể thu hồi\n"
    "• KHÔNG được ủy quyền lại\n"
    "• Xem quyền của mình tại /uy-quyen\n\n"
    "Ví dụ được ủy quyền:\n"
    "employee.*, class.approve_close,\n"
    "facility.manage… tùy Owner chọn.",
    470, 480, 360, 270, card_style("#FFFFFF", C_ORANGE),
)
p1.node(
    "QUẢN TRỊ VIÊN TỔ CHỨC\n(chức vụ mặc định, scope ORGANIZATION)\n\n"
    "• Mang toàn bộ catalog quyền\n"
    "• Gắn cả 4 bundle: HR, Đào tạo,\n"
    "  Lịch học, Cơ sở vật chất\n"
    "• Là 'cánh tay phải' của Owner\n"
    "• Không phải role đăng nhập —\n"
    "  vẫn là tài khoản STAFF/MANAGER + chức vụ",
    470, 770, 360, 190, card_style("#FFFFFF", C_ORANGE),
)
p1.node(
    "NGUYÊN TẮC\n\n"
    "Owner KHÔNG tự duyệt yêu cầu\n"
    "đóng/hủy lớp do chính mình tạo\n"
    "(SELF_APPROVAL_NOT_ALLOWED).\n\n"
    "Owner không bị chuyển phòng ban\n"
    "(TRANSFER_OWNER_NOT_ALLOWED).",
    470, 980, 360, 140, note_style(),
)

# Department column
p1.node(
    "HR / NHÂN SỰ PHÒNG BAN\n(role MANAGER + chức vụ + bundle HR)\n\n"
    "• Nhân sự: xem / tạo / sửa / xóa\n"
    "• Gán & thay đổi chức vụ\n"
    "• Reset mật khẩu nhân sự\n"
    "• Xem chi tiết nhạy cảm (email, SĐT)\n"
    "• Tạo hồ sơ giáo viên\n"
    "• Tạo yêu cầu nghỉ việc\n"
    "• Duyệt / từ chối nghỉ việc\n"
    "• Duyệt bước HR của chuyển phòng\n"
    "• Phạm vi: phòng ban được gán",
    880, 180, 360, 300, card_style("#FFFFFF", C_GREEN),
)
p1.node(
    "GIÁO VỤ\n(role STAFF + chức vụ, scope ORGANIZATION)\n\n"
    "• Sinh viên: xem / tạo / sửa / xóa\n"
    "• Cấp tài khoản đăng nhập cho sinh viên\n"
    "• Lớp học: xem / tạo / sửa / xóa\n"
    "• Gán giáo viên & phân công lại giáo viên\n"
    "• Hủy lớp / gửi yêu cầu hủy lớp\n"
    "• Gửi yêu cầu đóng lớp\n"
    "• Mở lại lớp đã đóng\n"
    "• Thêm / bớt sinh viên khỏi lớp\n"
    "• Xem lịch sử trạng thái lớp",
    880, 500, 360, 280, card_style("#FFFFFF", C_GREEN),
)
p1.node(
    "TRƯỞNG PHÒNG BAN\n(role STAFF + chức vụ, scope DEPARTMENT)\n\n"
    "• Xem lớp\n"
    "• Duyệt / từ chối HỦY lớp\n"
    "• Duyệt / từ chối ĐÓNG lớp\n"
    "• Mở lại lớp đã đóng\n"
    "• Duyệt bước Trưởng phòng cũ / mới\n"
    "  khi có yêu cầu chuyển phòng ban\n"
    "• Không được tự duyệt yêu cầu của mình\n"
    "• Người duyệt = trưởng phòng phụ trách\n"
    "  module STUDENT_MANAGEMENT",
    880, 800, 360, 250, card_style("#FFFFFF", C_GREEN),
)
p1.node(
    "NHÂN VIÊN CƠ SỞ VẬT CHẤT\n(role STAFF + chức vụ, scope DEPARTMENT)\n\n"
    "• Phòng: xem / tạo / sửa / xóa\n"
    "• Thiết bị: xem / tạo / sửa / xóa\n"
    "• Báo sự cố\n"
    "• Xem & xử lý sự cố\n"
    "• Cần module FACILITY_MANAGEMENT bật",
    880, 1070, 360, 140, card_style("#FFFFFF", C_GREEN),
)

# Self column
p1.node(
    "GIÁO VIÊN\n(role STAFF + chức vụ TEACHER)\n\n"
    "• Xem lớp được phân công (class.view)\n"
    "• Xem sinh viên (student.view)\n"
    "• Xem lịch dạy phòng ban (schedule.view)\n"
    "• Xem lịch của tôi (/schedules/me)\n"
    "• Báo sự cố nếu được cấp\n"
    "  facility.issue.report\n\n"
    "KHÔNG được: tạo/sửa lớp, nhập điểm,\n"
    "quản lý sinh viên, duyệt yêu cầu.",
    1290, 180, 360, 250, card_style("#FFFFFF", C_PURPLE),
)
p1.node(
    "GIÁO VIÊN — SELF\n\n"
    "• /schedules/me\n"
    "• /lich-cua-toi\n"
    "• Chỉ dùng subject trong JWT,\n"
    "  không nhận userId từ client",
    1290, 450, 360, 130, card_style("#FFFFFF", C_PURPLE),
)
p1.node(
    "SINH VIÊN\n(role STUDENT)\n\n"
    "• Xem hồ sơ của chính mình\n"
    "  student.self_view\n"
    "• Xem lớp của chính mình\n"
    "  class.self_view\n"
    "• Xem lịch của chính mình\n"
    "  schedule.self_view\n"
    "• Cổng /hoc-sinh\n"
    "• Trang /lich-cua-toi\n\n"
    "KHÔNG vào console quản trị,\n"
    "không CRUD bất kỳ dữ liệu nào.",
    1290, 600, 360, 250, card_style("#FFFFFF", C_PURPLE),
)
p1.node(
    "ĐIỀU KIỆN VÀO KHU ĐÀO TẠO\n\n"
    "canAccessAcademicArea = OWNER\n"
    "hoặc có ít nhất 1 quyền trong:\n"
    "employee.*, position.*, department.view,\n"
    "class.*, student.*, schedule.*, facility.*\n\n"
    "Sinh viên có student.self_view\n"
    "→ luôn vào /hoc-sinh, không vào /dao-tao.",
    1290, 870, 360, 200, note_style(F_SELF, C_PURPLE),
)

# Bottom dependency chain
p1.node("LUỒNG PHỤ THUỘC CHÍNH", 40, 1260, 1640, 30, H2)
chain = [
    (60, "SUPER_ADMIN\nDuyệt tổ chức"),
    (380, "OWNER\nToàn quyền tổ chức"),
    (700, "HR / GIÁO VỤ / TRƯỞNG PHÒNG\nQuản lý theo chức vụ"),
    (1140, "GIÁO VIÊN\nDạy & xem lớp"),
]
ids = []
for x, label in chain:
    ids.append(p1.node(label, x, 1300, 260, 58, flow_style("#FFFFFF", C_GRAY)))
p1.edge(ids[0], ids[1], "tạo / duyệt tổ chức")
p1.edge(ids[1], ids[2], "tạo phòng ban, chức vụ, gán người")
p1.edge(ids[2], ids[3], "phân công giáo viên")
sid = p1.node("SINH VIÊN\nHọc lớp", 1460, 1300, 200, 58, flow_style("#FFFFFF", C_GRAY))
p1.edge(ids[3], sid, "dạy")
gid = p1.node("TỔNG QUẢN LÝ\nNhận ủy quyền từ Owner", 380, 1385, 260, 55, flow_style("#FFFFFF", C_ORANGE))
p1.edge(ids[1], gid, "bổ nhiệm + ủy quyền", dashed=True)

# ---------------------------------------------------------------------------
# Matrix helper
# ---------------------------------------------------------------------------
def mark_style(v):
    if v == "✓":
        return "fillColor=#D9F7BE;fontColor=#237804;"
    if v == "△":
        return "fillColor=#FFF1B8;fontColor=#874D00;"
    if v == "—":
        return "fillColor=#FFFFFF;fontColor=#BFBFBF;"
    return "fillColor=#FFFFFF;fontColor=#1F2937;"


def matrix_page(pid, name, title, subtitle, columns, groups, footnote):
    margin = 35
    total_w = sum(columns)
    page = Page(pid, name, total_w + margin * 2 + 10, 100)
    page.node(title, margin, 16, total_w, 38, TITLE)
    page.node(subtitle, margin, 58, total_w, 30, SUB)
    page.node(
        "✓ = được phép theo thiết kế    △ = chỉ khi được cấp quyền/ủy quyền    — = không có trong thiết kế (mặc định)",
        margin, 92, total_w, 24,
        "text;html=1;fontSize=11;align=left;verticalAlign=middle;fontColor=#595959;",
    )
    y = 126
    # header
    x = margin
    for i, w in enumerate(columns):
        text = HEADERS[pid][i]
        page.node(text, x, y, w, 58, head_style("#DCE6F1" if i else "#E8EBF0", "#8C8C8C") + "fontColor=#1F2937;")
        x += w
    y += 58
    for item in groups:
        if item[0] == "GROUP":
            page.node(item[1], margin, y, total_w, 32,
                      head_style(C_BLUE, C_BLUE) + "fontSize=12;align=left;spacingLeft=10;")
            y += 32
            continue
        label, values = item
        page.node(label, margin, y, columns[0], 40,
                  "rounded=0;whiteSpace=wrap;html=1;fillColor=#FAFAFA;strokeColor=#D9D9D9;"
                  "fontSize=10.5;align=left;verticalAlign=middle;spacingLeft=7;fontColor=#1F2937;")
        x = margin + columns[0]
        for i, w in enumerate(columns[1:]):
            v = values[i]
            page.node(v, x, y, w, 40,
                      "rounded=0;whiteSpace=wrap;html=1;strokeColor=#D9D9D9;fontSize=14;"
                      "align=center;verticalAlign=middle;" + mark_style(v))
            x += w
        y += 40
    page.node(footnote, margin, y + 16, total_w, 74, note_style())
    page.height = y + 120
    return page


HEADERS = {
    "p2": [
        "Nhóm chức năng",
        "SUPER_ADMIN\n(Admin hệ thống)",
        "OWNER\n(Chủ tổ chức)",
        "TỔNG QUẢN LÝ\n(chức danh + ủy quyền)",
        "HR / MANAGER\n(Nhân sự phòng ban)",
        "GIÁO VỤ\n(STAFF + chức vụ)",
        "TRƯỞNG PHÒNG\n(STAFF + chức vụ)",
        "GIÁO VIÊN\n(STAFF + chức vụ)",
        "SINH VIÊN\n(STUDENT)",
    ],
    "p3": [
        "Nhóm chức năng",
        "OWNER\n(Chủ tổ chức)",
        "TỔNG QUẢN LÝ\n(nếu được ủy quyền)",
        "HR / MANAGER\n(Nhân sự phòng ban)",
        "GIÁO VỤ\n(STAFF + chức vụ)",
        "TRƯỞNG PHÒNG\n(STAFF + chức vụ)",
        "GIÁO VIÊN\n(STAFF + chức vụ)",
        "CSVC\n(STAFF + chức vụ)",
        "SINH VIÊN\n(STUDENT)",
    ],
}

p2_cols = [270, 150, 150, 175, 180, 160, 155, 150, 140]
p2 = matrix_page(
    "p2", "2. Ma trận chức năng — Nền tảng, tổ chức, nhân sự", 
    "2. MA TRẬN CHỨC NĂNG — NỀN TẢNG / TỔ CHỨC / NHÂN SỰ",
    "Đánh dấu theo HÀNH VI THỰC TẾ của controller và service, không chỉ theo role_permission.",
    p2_cols,
    [
        ("GROUP", "A. NỀN TẢNG — IdentityService (chỉ SUPER_ADMIN)"),
        ("Xem danh sách / chờ duyệt / chi tiết tổ chức", ["✓", "—", "—", "—", "—", "—", "—", "—"]),
        ("Duyệt / từ chối tổ chức đăng ký", ["✓", "—", "—", "—", "—", "—", "—", "—"]),
        ("Tạm ngưng / kích hoạt lại tổ chức", ["✓", "—", "—", "—", "—", "—", "—", "—"]),
        ("Bật / tắt module cho tổ chức", ["✓", "—", "—", "—", "—", "—", "—", "—"]),
        ("Xem danh mục module hệ thống", ["✓", "✓", "✓", "✓", "✓", "✓", "✓", "✓"]),
        ("Tài khoản: xem danh sách / chi tiết", ["✓", "—", "—", "—", "—", "—", "—", "—"]),
        ("Tài khoản: tạo mới (trừ SUPER_ADMIN)", ["✓", "—", "—", "—", "—", "—", "—", "—"]),
        ("Tài khoản: đổi trạng thái (khóa / vô hiệu / kích hoạt)", ["✓", "—", "—", "—", "—", "—", "—", "—"]),
        ("Tài khoản: đổi role", ["✓", "—", "—", "—", "—", "—", "—", "—"]),
        ("Tài khoản: reset mật khẩu", ["✓", "—", "—", "—", "—", "—", "—", "—"]),
        ("Nhật ký hệ thống (audit log)", ["✓", "—", "—", "—", "—", "—", "—", "—"]),
        ("Đăng nhập / refresh / logout / đổi mật khẩu", ["✓", "✓", "✓", "✓", "✓", "✓", "✓", "✓"]),
        ("GROUP", "B. TỔ CHỨC & NHÂN SỰ — PeopleService"),
        ("Phòng ban: xem danh sách / chi tiết", ["—", "✓", "△", "✓", "—", "—", "—", "—"]),
        ("Phòng ban: tạo / sửa / xóa", ["—", "✓", "△", "—", "—", "—", "—", "—"]),
        ("Phòng ban: xem tác động module", ["—", "✓", "△", "—", "—", "—", "—", "—"]),
        ("Chức vụ: xem danh sách / quyền / bundle", ["—", "✓", "△", "✓", "—", "—", "—", "—"]),
        ("Chức vụ: tạo / sửa / xóa / clone / xem impact", ["—", "✓", "△", "✓", "—", "—", "—", "—"]),
        ("Nhân sự: xem danh sách / chi tiết / lịch sử chức vụ", ["—", "✓", "△", "✓", "—", "—", "—", "—"]),
        ("Nhân sự: tạo mới", ["—", "✓", "△", "✓", "—", "—", "—", "—"]),
        ("Nhân sự: sửa hồ sơ", ["—", "✓", "△", "✓", "—", "—", "—", "—"]),
        ("Nhân sự: xem chi tiết nhạy cảm (email, SĐT)", ["—", "✓", "△", "✓", "—", "—", "—", "—"]),
        ("Nhân sự: gán / thay đổi chức vụ", ["—", "✓", "△", "✓", "—", "—", "—", "—"]),
        ("Nhân sự: reset mật khẩu", ["—", "✓", "△", "✓", "—", "—", "—", "—"]),
        ("Nhân sự: xóa / vô hiệu hóa", ["—", "✓", "△", "✓", "—", "—", "—", "—"]),
        ("Tạo hồ sơ giáo viên", ["—", "✓", "△", "✓", "—", "—", "—", "—"]),
        ("Chuyên môn: xem danh sách", ["—", "✓", "△", "✓", "—", "—", "—", "—"]),
        ("Chuyên môn: tạo mới", ["—", "✓", "△", "✓", "—", "—", "—", "—"]),
        ("Nghỉ việc: tạo yêu cầu", ["—", "✓", "△", "✓", "—", "—", "—", "—"]),
        ("Nghỉ việc: duyệt / từ chối", ["—", "✓", "△", "✓", "—", "—", "—", "—"]),
        ("Chuyển phòng: tạo yêu cầu", ["—", "✓", "△", "✓", "—", "—", "—", "—"]),
        ("Chuyển phòng: duyệt bước HR", ["—", "✓", "△", "✓", "—", "—", "—", "—"]),
        ("Chuyển phòng: duyệt bước Trưởng phòng cũ / mới", ["—", "✓", "△", "—", "—", "✓", "—", "—"]),
        ("Chuyển phòng: duyệt bước chính mình (EMPLOYEE)", ["—", "△", "△", "△", "△", "△", "△", "△"]),
        ("Bổ nhiệm / bãi nhiệm Tổng quản lý", ["—", "✓", "—", "—", "—", "—", "—", "—"]),
        ("Ủy quyền: xem tất cả / tạo / sửa / thu hồi", ["—", "✓", "—", "—", "—", "—", "—", "—"]),
        ("Ủy quyền: xem quyền đang nhận (/delegations/me)", ["—", "✓", "✓", "✓", "✓", "✓", "✓", "—"]),
    ],
    "Lưu ý: HR/Giáo vụ/Trưởng phòng/Giáo viên là ROLE KHUNG (MANAGER/STAFF) — quyền thực tế đến từ CHỨC VỤ + BUNDLE. "
    "Dòng 'chuyển phòng — bước Trưởng phòng' được quyết định theo CHỨC DANH đang giữ, không chỉ theo mã quyền. "
    "SUPER_ADMIN có toàn bộ catalog ở tầng role nhưng FE không có màn PeopleService và IdentityService chỉ mở API nền tảng cho role này.",
)

p3_cols = [270, 150, 170, 170, 170, 160, 150, 160, 140]
p3 = matrix_page(
    "p3", "3. Ma trận chức năng — Đào tạo, lịch, CSVC",
    "3. MA TRẬN CHỨC NĂNG — ĐÀO TẠO / LỊCH HỌC / CƠ SỞ VẬT CHẤT",
    "Ma trận hiển thị theo CHỨC VỤ MẶC ĐỊNH do DefaultPositionSeeder tạo cho tổ chức mới.",
    p3_cols,
    [
        ("GROUP", "C. SINH VIÊN — module STUDENT_MANAGEMENT"),
        ("Xem danh sách / chi tiết sinh viên", ["✓", "△", "✓", "✓", "—", "✓", "—", "—"]),
        ("Thêm sinh viên", ["✓", "△", "—", "✓", "—", "—", "—", "—"]),
        ("Sửa hồ sơ sinh viên", ["✓", "△", "—", "✓", "—", "—", "—", "—"]),
        ("Xóa / vô hiệu hóa sinh viên", ["✓", "△", "—", "✓", "—", "—", "—", "—"]),
        ("Cấp tài khoản đăng nhập cho sinh viên", ["✓", "△", "—", "✓", "—", "—", "—", "—"]),
        ("Xem hồ sơ của chính mình", ["—", "—", "—", "—", "—", "—", "—", "✓"]),
        ("Xem lớp của chính mình", ["—", "—", "—", "—", "—", "—", "—", "✓"]),
        ("GROUP", "D. LỚP HỌC — vòng đời & phân công"),
        ("Xem danh sách / chi tiết / lịch sử trạng thái lớp", ["✓", "△", "✓", "✓", "✓", "✓", "—", "—"]),
        ("Tạo lớp", ["✓", "△", "—", "✓", "—", "—", "—", "—"]),
        ("Sửa lớp", ["✓", "△", "—", "✓", "—", "—", "—", "—"]),
        ("Xóa lớp", ["✓", "△", "—", "✓", "—", "—", "—", "—"]),
        ("Gán giáo viên cho lớp", ["✓", "△", "—", "✓", "—", "—", "—", "—"]),
        ("Phân công lại giáo viên (sau chuyển phòng / nghỉ)", ["✓", "△", "—", "✓", "—", "—", "—", "—"]),
        ("Hủy lớp (lớp không còn sinh viên)", ["✓", "△", "—", "✓", "—", "—", "—", "—"]),
        ("Yêu cầu hủy lớp (lớp còn sinh viên)", ["✓", "△", "—", "✓", "—", "—", "—", "—"]),
        ("Duyệt / từ chối hủy lớp", ["✓", "△", "—", "△", "✓", "—", "—", "—"]),
        ("Yêu cầu đóng lớp", ["✓", "△", "—", "✓", "—", "—", "—", "—"]),
        ("Duyệt / từ chối đóng lớp", ["✓", "△", "—", "△", "✓", "—", "—", "—"]),
        ("Mở lại lớp đã đóng", ["✓", "△", "—", "✓", "✓", "—", "—", "—"]),
        ("Thêm / bớt sinh viên khỏi lớp", ["✓", "△", "—", "✓", "—", "—", "—", "—"]),
        ("GROUP", "E. LỊCH HỌC — module SCHEDULE_MANAGEMENT"),
        ("Xem lịch của phòng ban", ["✓", "△", "✓", "—", "—", "✓", "—", "—"]),
        ("Tạo buổi học", ["✓", "△", "—", "—", "—", "—", "—", "—"]),
        ("Sửa buổi học", ["✓", "△", "—", "—", "—", "—", "—", "—"]),
        ("Hủy buổi học", ["✓", "△", "—", "—", "—", "—", "—", "—"]),
        ("Xóa buổi học", ["✓", "△", "—", "—", "—", "—", "—", "—"]),
        ("Gợi ý phòng trống khi xếp lịch", ["✓", "△", "—", "—", "—", "—", "—", "—"]),
        ("Xem lịch của tôi (/schedules/me)", ["—", "—", "—", "—", "—", "✓", "—", "✓"]),
        ("GROUP", "F. CƠ SỞ VẬT CHẤT — module FACILITY_MANAGEMENT"),
        ("Xem phòng", ["✓", "△", "—", "—", "—", "—", "✓", "—"]),
        ("Tạo / sửa / xóa phòng", ["✓", "△", "—", "—", "—", "—", "✓", "—"]),
        ("Xem thiết bị", ["✓", "△", "—", "—", "—", "—", "✓", "—"]),
        ("Tạo / sửa / xóa thiết bị", ["✓", "△", "—", "—", "—", "—", "✓", "—"]),
        ("Báo sự cố", ["✓", "△", "—", "—", "—", "△", "✓", "—"]),
        ("Xem sự cố", ["✓", "△", "—", "—", "—", "△", "✓", "—"]),
        ("Xử lý sự cố", ["✓", "△", "—", "—", "—", "—", "✓", "—"]),
    ],
    "Lưu ý quan trọng: (1) Giáo vụ có mã class.approve_close trong bundle nhưng ClassApprovalPolicy chỉ cho OWNER hoặc TRƯỞNG PHÒNG phụ trách module STUDENT_MANAGEMENT duyệt → đánh dấu △. "
    "(2) Giáo viên chỉ báo sự cố khi được cấp thêm facility.issue.report — chức vụ mặc định chưa có. "
    "(3) Các dòng lịch/CSVC yêu cầu module tương ứng đang bật ở cả tổ chức và phòng ban.",
)

# ---------------------------------------------------------------------------
# PAGE 4 — Workflows
# ---------------------------------------------------------------------------
p4 = Page("p4", "4. Luồng nghiệp vụ chi tiết", 1720, 1680)
p4.node("4. CÁC LUỒNG NGHIỆP VỤ CHI TIẾT", 35, 16, 1650, 40, TITLE)
p4.node("Ai làm bước nào, cần quyền gì, điều kiện dừng và kết quả cuối cùng.", 35, 58, 1650, 28, SUB)

def lane(y, h, title, stroke, fill):
    p4.node(title, 35, y, 1650, 38, head_style(stroke, stroke) + "fontSize=13;align=left;spacingLeft=12;")
    p4.node("", 35, y + 38, 1650, h - 38,
            f"rounded=1;fillColor={fill};strokeColor={stroke};strokeWidth=1;opacity=28;")

def wf_node(text, x, y, w=230, *args, h=76, stroke=C_GRAY, fill="#FFFFFF"):
    if args and isinstance(args[0], (int, float)):
        h, args = args[0], args[1:]
    if args:
        stroke = args[0]
    if len(args) > 1:
        fill = args[1]
    return p4.node(text, x, y, w, h, flow_style(fill, stroke))

# Lane 1 — class lifecycle
lane(100, 400, "1. VÒNG ĐỜI LỚP HỌC — Giáo vụ tạo, Trưởng phòng duyệt", C_GREEN, F_DEPT)
n1 = wf_node("GIÁO VỤ tạo lớp\nclass.create\n(status CHUA_BAT_DAU)", 60, 160, 215, C_GREEN)
n2 = wf_node("Cập nhật lớp\nclass.edit\nđổi trạng thái theo thời gian", 300, 160, 215, C_GREEN)
n3 = wf_node("Lớp còn sinh viên?\n(studentCount > 0)", 540, 160, 200, C_RED, "#FFF1F0")
n4 = wf_node("Còn SV:\nGửi yêu cầu hủy\nclass.cancel\n(cancelState=PENDING)", 770, 150, 215, C_ORANGE)
n5 = wf_node("TRƯỞNG PHÒNG duyệt hủy\nclass.approve_close\nkhông được tự duyệt", 1010, 150, 230, C_ORANGE)
n6 = wf_node("DA_HUY\nLý do + lịch sử sự kiện", 1265, 150, 190, C_RED)
n7 = wf_node("Không còn SV:\nHủy ngay\nclass.cancel", 770, 275, 215, C_ORANGE)
n8 = wf_node("DA_HUY", 1010, 286, 140, 54, C_RED)
n9 = wf_node("Giáo vụ gửi yêu cầu ĐÓNG\nclass.request_close\n(closeState=PENDING)", 60, 375, 300, C_PURPLE)
n10 = wf_node("TRƯỞNG PHÒNG duyệt đóng\nclass.approve_close\nhoặc từ chối + lý do", 400, 375, 300, C_PURPLE)
n11 = wf_node("closeState=CLOSED\nstatus=DA_KET_THUC", 740, 375, 230, C_PURPLE)
n12 = wf_node("TRƯỞNG PHÒNG / OWNER mở lại\nclass.reopen\n(closeState=NONE)", 1010, 375, 280, C_PURPLE)
p4.edge(n1, n2, "class.edit / assign_teacher", label_dy=-16)
p4.edge(n2, n3)
p4.edge(n3, n4, "Có")
p4.edge(n4, n5)
p4.edge(n5, n6, "duyệt", label_dy=-16)
p4.edge(n3, n7, "Không")
p4.edge(n7, n8)
p4.edge(n9, n10)
p4.edge(n10, n11, "duyệt", label_dy=-16)
p4.edge(n11, n12)
p4.node("Lưu ý: xóa lớp (class.delete) là thao tác riêng; hủy/đóng lớp đi qua state machine và ghi class_status_log + close event. "
        "SELF_APPROVAL_NOT_ALLOWED chặn người tạo yêu cầu tự duyệt.", 60, 465, 1230, 28,
        "text;html=1;fontSize=10.5;align=left;verticalAlign=middle;fontColor=#595959;")

# Lane 2 — transfer
lane(520, 270, "2. CHUYỂN PHÒNG BAN 4 BÊN — đủ 4 duyệt mới áp dụng", C_ORANGE, F_ORG)
t1 = wf_node("HR / người có quyền tạo\nemployee.transfer\ncần Trưởng phòng 2 bên tồn tại", 55, 575, 245, C_ORANGE)
t2 = wf_node("Bước 1: SOURCE_HEAD\nTrưởng phòng CŨ duyệt\n(theo chức danh)", 325, 575, 240, C_ORANGE)
t3 = wf_node("Bước 2: TARGET_HEAD\nTrưởng phòng MỚI duyệt\n(theo chức danh)", 590, 575, 240, C_ORANGE)
t4 = wf_node("Bước 3: HR duyệt\nemployee.approve_transfer", 855, 575, 230, C_ORANGE)
t5 = wf_node("Bước 4: EMPLOYEE duyệt\nchính người được chuyển\n(xác nhận đồng ý)", 1110, 575, 240, C_ORANGE)
t6 = wf_node("Áp dụng trong 1 transaction:\nđổi phòng + thu hồi assignment cũ\n+ gắn nhãn lớp cần phân công lại", 1380, 565, 270, 96, C_GREEN)
p4.edge(t1, t2)
p4.edge(t2, t3)
p4.edge(t3, t4)
p4.edge(t4, t5)
p4.edge(t5, t6, "đủ 4 APPROVED", label_dy=-16)
rej = wf_node("Bất kỳ bước nào REJECTED\n→ dừng toàn bộ, gửi thông báo", 590, 690, 280, 62, C_RED)
p4.edge(t3, rej, "từ chối", dashed=True)
p4.node("Người khởi tạo được hủy khi còn PENDING (/transfer-requests/{id}/cancel). OWNER không bị chuyển phòng. "
        "Một nhân sự chỉ có 1 yêu cầu PENDING tại một thời điểm.", 55, 760, 900, 24,
        "text;html=1;fontSize=10.5;align=left;verticalAlign=middle;fontColor=#595959;")

# Lane 3 — resignation
lane(830, 250, "3. NGHỈ VIỆC — một bước duyệt bởi HR", C_RED, "#FFF1F0")
r1 = wf_node("HR tạo yêu cầu nghỉ việc\nemployee.resign\n(trong phòng ban)", 55, 900, 280, C_RED)
r2 = wf_node("HR duyệt / từ chối\nemployee.approve_resignation", 390, 900, 300, C_RED)
r3 = wf_node("Duyệt:\nmember → INACTIVE\n+ offboarding giáo viên\n+ gắn nhãn lớp cần phân công lại", 745, 880, 330, 96, C_GREEN)
r4 = wf_node("Từ chối:\ngiữ nguyên trạng thái\n+ lý do", 745, 1005, 330, 66, C_RED)
p4.edge(r1, r2)
p4.edge(r2, r3, "duyệt", label_dy=-14)
p4.edge(r2, r4, "từ chối",
        style="exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;")

# Lane 4 — delegation
lane(1100, 250, "4. BỔ NHIỆM & ỦY QUYỀN TỔNG QUẢN LÝ", C_ORANGE, F_ORG)
d1 = wf_node("OWNER bổ nhiệm\nchức danh 'Tổng quản lý'\n(chỉ Owner gọi được API)", 55, 1155, 270, C_ORANGE)
d2 = wf_node("OWNER tạo ủy quyền\nscope ORGANIZATION\nthời hạn from/to\nchọn tập quyền con", 365, 1155, 270, C_ORANGE)
d3 = wf_node("TỔNG QUẢN LÝ có quyền hiệu lực\n= quyền chức vụ + quyền ủy quyền\n(không vượt quá quyền Owner)", 675, 1155, 300, C_GREEN)
d4 = wf_node("OWNER sửa / thu hồi\n(revoke có lý do, ghi audit)", 1015, 1155, 270, C_ORANGE)
d5 = wf_node("Tổng quản lý KHÔNG được\nủy quyền lại cho người khác", 1320, 1265, 250, C_RED)
p4.edge(d1, d2)
p4.edge(d2, d3)
p4.edge(d3, d4, "khi cần", label_dy=-14)
p4.edge(d3, d5, "cấm", dashed=True,
        style="exitX=0.75;exitY=1;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;")
p4.node("Chức danh 'Tổng quản lý' không tự kèm quyền. Mọi quyền đến từ bảng delegation; quyền phải nằm trong catalog và trong quyền hiện có của Owner.",
        55, 1252, 1100, 28, "text;html=1;fontSize=10.5;align=left;verticalAlign=middle;fontColor=#595959;")

# Lane 5 — student account
lane(1400, 230, "5. CẤP TÀI KHOẢN SINH VIÊN → CỔNG SELF", C_PURPLE, F_SELF)
s1 = wf_node("GIÁO VỤ tạo hồ sơ sinh viên\nstudent.create", 55, 1455, 290, C_PURPLE)
s2 = wf_node("Cấp tài khoản đăng nhập\nstudent.create_account\n(mật khẩu tạm)", 385, 1455, 290, C_PURPLE)
s3 = wf_node("SINH VIÊN đăng nhập\n→ /hoc-sinh\n(student.self_view)", 715, 1455, 280, C_PURPLE)
s4 = wf_node("Xem hồ sơ + lớp của mình\n/students/me\n/students/me/classes", 1035, 1455, 300, C_PURPLE)
s5 = wf_node("Xem lịch của mình\n/schedules/me\n/lich-cua-toi\n(class.self_view + schedule.self_view)", 1375, 1440, 260, 96, C_PURPLE)
p4.edge(s1, s2)
p4.edge(s2, s3)
p4.edge(s3, s4)
p4.edge(s4, s5)

# ---------------------------------------------------------------------------
# PAGE 5 — Permission catalog, bundles, default positions, effective formula
# ---------------------------------------------------------------------------
p5 = Page("p5", "5. Danh mục quyền, bundle & cách tính quyền", 1720, 1360)
p5.node("5. DANH MỤC QUYỀN — BUNDLE — CHỨC VỤ MẶC ĐỊNH — CÁCH TÍNH QUYỀN HIỆU LỰC", 35, 16, 1650, 40, TITLE)
p5.node("Mã quyền dạng <module>.<resource>.<action>; module_code = NULL nghĩa là quyền nhân sự dùng chung cho mọi phòng ban.",
        35, 58, 1650, 28, SUB)

p5.node(
    "CÔNG THỨC QUYỀN HIỆU LỰC\n"
    "Quyền hiệu lực = quyền của ROLE hệ thống  ∪  quyền của CHỨC VỤ  ∪  quyền từ BUNDLE của chức vụ  ∪  quyền từ ỦY QUYỀN còn hiệu lực\n"
    "Sau đó lọc theo: (1) department_member đang ACTIVE   (2) assignment đang ACTIVE trong thời hạn   "
    "(3) allowed_scopes của quyền chứa ORGANIZATION hoặc DEPARTMENT phù hợp   (4) module đang bật ở tổ chức VÀ phòng ban.\n"
    "OWNER bỏ qua bước lọc quyền (hasRole('OWNER')), nhưng vẫn phải đúng tổ chức (org_id lấy từ JWT).",
    35, 96, 1650, 90, note_style(F_PLATFORM, C_BLUE).replace("fontColor=#614700", "fontColor=#1F2937"),
)

bundle_cols = [
    (35, "HR_MANAGEMENT\nQuản lý nhân sự", C_ORANGE, F_ORG, [
        "employee.view", "employee.create", "employee.edit", "employee.delete",
        "employee.reset_password", "employee.assign_position",
        "employee.view_detail", "employee.resign", "employee.approve_resignation",
        "employee.transfer", "employee.approve_transfer",
        "position.view", "position.manage", "department.view",
    ]),
    (445, "ACADEMIC_MANAGEMENT\nQuản lý đào tạo", C_GREEN, F_DEPT, [
        "student.view", "student.create", "student.edit", "student.delete",
        "student.create_account",
        "class.view", "class.create", "class.edit", "class.delete",
        "class.assign_teacher", "class.teacher.reassign",
        "class.cancel", "class.request_close", "class.approve_close", "class.reopen",
    ]),
    (855, "SCHEDULE_MANAGEMENT\nQuản lý lịch học", C_BLUE, F_PLATFORM, [
        "schedule.view", "schedule.create", "schedule.edit", "schedule.update",
        "schedule.cancel_session", "schedule.delete",
        "(schedule.self_view là quyền SELF, không nằm trong bundle)",
    ]),
    (1265, "FACILITY_MANAGEMENT\nQuản lý cơ sở vật chất", C_PURPLE, F_SELF, [
        "facility.view", "facility.manage",
        "facility.room.view", "facility.room.create", "facility.room.update", "facility.room.delete",
        "facility.equipment.view", "facility.equipment.create", "facility.equipment.update",
        "facility.equipment.delete", "facility.issue.report", "facility.issue.resolve",
    ]),
]
for x, title, stroke, fill, perms in bundle_cols:
    p5.node(title, x, 210, 390, 56, head_style(stroke, stroke) + "fontSize=12;align=left;spacingLeft=10;")
    p5.node("\n".join("• " + p for p in perms), x, 266, 390,
            300, card_style("#FFFFFF", stroke, font=10.5))
p5.node(
    "QUYỀN SELF (gắn trực tiếp role STUDENT)\n\n"
    "• student.self_view\n• class.self_view\n• schedule.self_view\n\n"
    "Không nằm trong bundle; không cấp qua chức vụ.\n"
    "Chỉ dùng cho cổng /hoc-sinh và /lich-cua-toi.",
    1265, 590, 390, 150, note_style(F_SELF, C_PURPLE),
)

# Default positions table
p5.node("CHỨC VỤ MẶC ĐỊNH (DefaultPositionSeeder) VÀ QUYỀN ĐI KÈM", 35, 700, 1200, 30, H2)
tbl_y = 740
p5.node("Chức vụ", 35, tbl_y, 230, 40, head_style("#E8EBF0", "#8C8C8C") + "fontColor=#1F2937;fontSize=12;")
p5.node("Phạm vi", 265, tbl_y, 120, 40, head_style("#E8EBF0", "#8C8C8C") + "fontColor=#1F2937;fontSize=12;")
p5.node("Bundle", 385, tbl_y, 220, 40, head_style("#E8EBF0", "#8C8C8C") + "fontColor=#1F2937;fontSize=12;")
p5.node("Quyền chính", 605, tbl_y, 630, 40, head_style("#E8EBF0", "#8C8C8C") + "fontColor=#1F2937;fontSize=12;")
pos_rows = [
    ("Quản trị viên tổ chức", "ORGANIZATION", "HR + Đào tạo + Lịch + CSVC", "Toàn bộ catalog quyền; dùng như người vận hành cấp tổ chức"),
    ("Giáo vụ", "ORGANIZATION", "ACADEMIC_MANAGEMENT", "Sinh viên CRUD, cấp tài khoản, lớp CRUD, gán GV, hủy/đóng/mở lớp"),
    ("Giáo viên", "DEPARTMENT", "—", "class.view, student.view, schedule.view"),
    ("Trưởng phòng ban", "DEPARTMENT", "—", "class.view, class.approve_close, class.reopen"),
    ("Nhân sự phòng ban", "DEPARTMENT", "HR_MANAGEMENT", "employee.*, position.*, department.view, class.view, student.view"),
    ("Nhân viên CSVC", "DEPARTMENT", "FACILITY_MANAGEMENT", "Toàn bộ facility.* (phòng, thiết bị, sự cố)"),
    ("Nhân viên", "DEPARTMENT", "—", "Không có quyền mặc định"),
]
for i, (name, scope, bundle, desc) in enumerate(pos_rows):
    yy = tbl_y + 40 + i * 42
    fill = "#FFFFFF" if i % 2 == 0 else "#FAFAFA"
    st = f"rounded=0;whiteSpace=wrap;html=1;fillColor={fill};strokeColor=#D9D9D9;fontSize=10.5;align=left;verticalAlign=middle;spacingLeft=6;"
    p5.node(name, 35, yy, 230, 42, st + "fontStyle=1;")
    p5.node(scope, 265, yy, 120, 42, st)
    p5.node(bundle, 385, yy, 220, 42, st)
    p5.node(desc, 605, yy, 630, 42, st)

p5.node(
    "ĐIỀU KIỆN MODULE & PHẠM VI\n\n"
    "• STUDENT_MANAGEMENT: cần bật ở organization_module VÀ department_module của phòng ban xử lý.\n"
    "• SCHEDULE_MANAGEMENT / FACILITY_MANAGEMENT: guard kiểm tra module trước mọi thao tác.\n"
    "• HR_MANAGEMENT: module_code = NULL → không bị chặn theo module, nhưng vẫn lọc theo phòng ban.\n"
    "• allowed_scopes: DEPARTMENT chỉ có hiệu lực trong phòng đang gán; ORGANIZATION áp cho toàn tổ chức.\n"
    "• Ủy quyền chỉ nhận quyền có allowed_scopes chứa ORGANIZATION.",
    35, 1095, 970, 150, note_style(F_NOTE, "#D4B106"),
)
p5.node(
    "THỨ TỰ KIỂM TRA KHI GỌI API\n\n"
    "1. JWT hợp lệ (hoặc internal key)\n"
    "2. Role / authority (@PreAuthorize)\n"
    "3. Permission + department scope\n"
    "   (@RequirePermission / Actor)\n"
    "4. Module đang bật\n"
    "5. Trạng thái bản ghi (PENDING, ACTIVE…)\n"
    "6. Quy tắc nghiệp vụ riêng\n"
    "   (self-approval, trưởng phòng, owner…)",
    1030, 1095, 655, 150, note_style(F_PLATFORM, C_BLUE).replace("fontColor=#614700", "fontColor=#1F2937"),
)

# ---------------------------------------------------------------------------
# PAGE 6 — UI routes and landing
# ---------------------------------------------------------------------------
p6 = Page("p6", "6. Màn hình & route theo vai trò", 1720, 1320)
p6.node("6. MÀN HÌNH & ROUTE THEO VAI TRÒ", 35, 16, 1650, 40, TITLE)
p6.node("FE guard chỉ là UX; quyền thật do backend chặn bằng 401/403. Route nào cũng phải gọi đúng API được phép.",
        35, 58, 1650, 28, SUB)

p6.node(
    "CÔNG KHAI / DÙNG CHUNG\n\n"
    "/dang-nhap                  Đăng nhập\n"
    "/dang-ky                    Đăng ký tổ chức (UI)\n"
    "/quen-mat-khau              Yêu cầu liên kết đặt lại\n"
    "/dat-lai-mat-khau?token=…   Đặt mật khẩu mới\n"
    "/doi-mat-khau               Bắt buộc khi còn MK tạm\n"
    "/xem-thu/:vaiTro            Xem thử vai trò\n"
    "/lich-cua-toi               Lịch của tôi (GV/SV)",
    35, 104, 560, 250, card_style("#FFFFFF", C_GRAY),
)
p6.node(
    "SUPER_ADMIN → /quan-tri\n\n"
    "/quan-tri                         Tổng quan\n"
    "/quan-tri/to-chuc                 Tổ chức chờ duyệt\n"
    "/quan-tri/to-chuc/tat-ca          Tất cả tổ chức\n"
    "/quan-tri/to-chuc/:id             Chi tiết tổ chức\n"
    "/quan-tri/to-chuc/:id/lich-su     Lịch sử duyệt\n"
    "/quan-tri/module                  Danh mục module\n"
    "/quan-tri/tai-khoan               Quản lý tài khoản\n"
    "/quan-tri/tai-khoan/:id           Chi tiết tài khoản\n"
    "/quan-tri/nhat-ky                 Nhật ký hệ thống",
    35, 374, 560, 300, card_style("#FFFFFF", C_BLUE),
)
p6.node(
    "OWNER → /to-chuc\n(OwnerGuard: OWNER hoặc ORG_OWNER)\n\n"
    "/to-chuc                    Phòng ban\n"
    "/to-chuc/phong-ban/:id      Chi tiết phòng ban\n"
    "                            (nhân sự nằm trong đây)\n"
    "/to-chuc/chuc-vu            Chức vụ + bundle\n"
    "/to-chuc/uy-quyen           Tổng quản lý & ủy quyền",
    35, 694, 560, 220, card_style("#FFFFFF", C_ORANGE),
)
p6.node(
    "KHU ĐÀO TẠO → /dao-tao\n(AcademicGuard: OWNER hoặc có quyền nghiệp vụ)\n\n"
    "/dao-tao/nhan-su            Nhân sự phòng ban\n"
    "/dao-tao/chuyen-phong       Yêu cầu chuyển phòng\n"
    "/dao-tao/chuc-vu            Chức vụ (PeopleEditGuard)\n"
    "/dao-tao/giao-vien          Giáo viên\n"
    "/dao-tao/giao-vien/:id      Chi tiết giáo viên\n"
    "/dao-tao/lop-hoc            Lớp học\n"
    "/dao-tao/lop-hoc/:id        Chi tiết lớp + vòng đời\n"
    "/dao-tao/sinh-vien          Sinh viên\n"
    "/dao-tao/lich-hoc           Lịch phòng ban\n"
    "/dao-tao/lich-cua-toi       Lịch của tôi\n"
    "/dao-tao/co-so-vat-chat     Phòng & thiết bị",
    35, 934, 560, 330, card_style("#FFFFFF", C_GREEN),
)
p6.node(
    "SELF\n\n"
    "/hoc-sinh        Cổng sinh viên\n"
    "                  (student.self_view)\n"
    "/uy-quyen        Quyền đang được ủy quyền\n"
    "                  (mọi thành viên tổ chức)\n"
    "/lich-cua-toi    Lịch của chính mình\n"
    "                  (giáo viên & sinh viên)",
    620, 104, 350, 200, card_style("#FFFFFF", C_PURPLE),
)

p6.node("ĐIỀU HƯỚNG SAU ĐĂNG NHẬP", 1000, 104, 650, 30, H2)
landing = [
    ("SUPER_ADMIN", "/quan-tri"),
    ("OWNER / ORG_OWNER", "/to-chuc"),
    ("Có quyền khu Đào tạo\n(employee.*, class.*, student.*…)", "/dao-tao"),
    ("Có student.self_view", "/hoc-sinh"),
    ("Role không có màn hình", "/xem-thu/{role}\nhoặc thông báo chưa hỗ trợ"),
]
ly = 145
for who, path in landing:
    p6.node(who, 1000, ly, 330, 62, card_style("#FFFFFF", C_GRAY, font=10.5))
    p6.node(path, 1350, ly, 300, 62, flow_style("#FFFFFF", C_BLUE))
    ly += 72

p6.node(
    "MENU KHU ĐÀO TẠO ĐƯỢC LỌC THEO QUYỀN\n\n"
    "• Nhân sự        ← employee.view\n"
    "• Chuyển phòng   ← employee.transfer / approve_transfer / view\n"
    "• Giáo viên      ← employee.view / employee.edit\n"
    "• Lớp học        ← class.view\n"
    "• Sinh viên      ← student.view\n"
    "• Lịch học       ← schedule.view\n"
    "• Lịch của tôi   ← schedule.self_view\n"
    "• Cơ sở vật chất ← bất kỳ facility.*\n"
    "• Chức vụ        ← position.manage",
    1000, 520, 650, 260, note_style(F_DEPT, C_GREEN).replace("fontColor=#614700", "fontColor=#1F2937"),
)
p6.node(
    "GHI NHỚ\n\n"
    "• Ẩn menu/nút KHÔNG phải bảo mật.\n"
    "• Mọi endpoint đều kiểm lại role + permission.\n"
    "• ORG_ADMIN, ACADEMIC_STAFF, FACILITY_STAFF\n"
    "  chưa có slug FE → không có màn hình.\n"
    "• Tài khoản còn mật khẩu tạm bị đẩy sang\n"
    "  /doi-mat-khau trước khi vào console.",
    1000, 810, 650, 180, note_style(F_NOTE, "#D4B106"),
)

xml = (
    '<mxfile host="app.diagrams.net" agent="MEMS" version="24.7.17" type="device">\n'
    + "\n".join(p.xml() for p in [p1, p2, p3, p4, p5, p6])
    + "\n</mxfile>\n"
)
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(xml, encoding="utf-8")
print(f"Wrote {OUT} ({len(xml)} chars, {sum(len(p.cells) for p in [p1,p2,p3,p4,p5,p6])} cells)")
