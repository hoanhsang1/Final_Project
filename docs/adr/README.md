# Architecture Decision Records (ADR)

Mỗi ADR ghi **tại sao** chọn một hướng, kể cả phương án bị bỏ. Giữ ngắn (nửa trang).
Trạng thái: `Accepted` / `Proposed` / `Superseded`. Không xoá ADR cũ — nếu đổi quyết định,
tạo ADR mới và đánh dấu ADR cũ là `Superseded by ADR-00xx`.

| ADR | Tiêu đề | Trạng thái |
|---|---|---|
| [0001](0001-astryx-thay-antd.md) | Thay Ant Design 5 bằng Astryx, bỏ React Hook Form/Zod | Accepted 14/11, verify 26/11 |
| [0002](0002-gateway-strip-prefix.md) | Chuẩn hoá prefix API qua Vite proxy + gateway `StripPrefix=1` | Accepted, verify 26/11 |
| [0003](0003-multi-db-soft-reference.md) | Tham chiếu liên dịch vụ là soft reference | Accepted (hiện trạng) |

Các quyết định nghiệp vụ đang chốt dần (phòng, tiết học, tiêu chí dữ liệu) **không nằm ở
đây** mà ở `../scope-can-chot-xep-lich.md` — P4 vẫn BLOCKED.
