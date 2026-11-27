# ADR-0002 — Chuẩn hoá prefix API qua Vite proxy + gateway `StripPrefix=1`

- **Ngày:** 26/11/2026 (đối chiếu code hiện tại)
- **Trạng thái:** Accepted

## Bối cảnh

FE gọi nhiều nhóm endpoint với quy ước không đồng nhau: IdentityService mapping ở
`/api/v1/...`, còn PeopleService mapping một số controller ở **gốc** (`/departments`,
`/classes`, `/teachers`) và một số khác dưới `/api/...`. Nếu không thống nhất, FE phải hardcode
nhiều base URL hoặc sửa BE.

## Quyết định

- FE **không hardcode host**: `vite.config.ts` proxy các prefix
  `/api`, `/departments`, `/positions`, `/permissions` tới `VITE_API_TARGET`
  (mặc định `http://127.0.0.1:8080` = gateway). Dùng tunnel thì set biến môi trường, không sửa file.
- Gateway route:
  - Identity `/api/v1/auth|modules|organizations|accounts|audit-logs/**` → `:8081`, **giữ nguyên path**.
  - People `/departments/**`, `/positions/**`, `/permissions/**` → `:8082`, **giữ nguyên path**.
  - People `/api/classes/**`, `/api/teachers/**`, `/api/specialties/**` → `:8082` với
    **`StripPrefix=1`** → controller nhận `/classes`, `/teachers`, `/specialties`.
- Proxy tồn tại để dev không phụ thuộc CORS/tách domain.

## Phương án bị bỏ

- Đổi FE theo từng service (nhiều base URL, khó test, dễ lệch mock).
- Đổi mapping controller BE (ảnh hưởng client khác và contract đã dùng).

## Hệ quả / việc còn mở

- Mock E2E phải khớp **đúng path FE gọi**, không phải path sau `StripPrefix`.
- ⚠️ `docker-compose.yml` **chưa truyền `PEOPLE_SERVICE_URL`** cho gateway → route People
  rơi về default `localhost:8082`; cần kiểm tra khi chạy Docker.
- ⚠️ Comment trong `vite.config.ts` vẫn nói "backend chưa cấu hình CORS" — đã sai (4 service
  có `CorsConfig`); chưa sửa source trong đợt dọn docs này.
