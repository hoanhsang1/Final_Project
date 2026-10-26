/**
 * Bản nháp cấu hình module — chống mất dữ liệu khi rời trang chưa lưu.
 *
 * Khi người dùng chọn "Rời trang" (hoặc trình duyệt đóng tab) thì thay đổi
 * vẫn không mất: lần mở lại màn cấu hình sẽ thấy bản nháp và chọn áp dụng hay
 * bỏ. Dữ liệu chỉ gồm **mã module** — không có thông tin nhạy cảm, và chỉ
 * gắn với `orgId` nên không rò sang tổ chức khác.
 *
 * `localStorage` có thể bị chặn (chế độ riêng tư, quota) → mọi thao tác đều
 * nuốt lỗi: mất nháp là thiệt thòi nhỏ, nhưng không được làm hỏng màn hình.
 */

/** Bản nháp cấu hình module của 1 tổ chức. */
export interface ModuleConfigDraft {
  /** Tập mã module người dùng đã chọn. */
  codes: string[];
  /** Thời điểm ghi nháp (epoch ms). */
  savedAt: number;
}

const KEY_PREFIX = 'mems.module-config-draft.';

function draftKey(orgId: string): string {
  return `${KEY_PREFIX}${orgId}`;
}

/** Đọc nháp của tổ chức. Trả `null` nếu không có hoặc dữ liệu hỏng. */
export function readDraft(orgId: string): ModuleConfigDraft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(orgId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<ModuleConfigDraft>;
    if (!Array.isArray(parsed.codes) || parsed.codes.some((code) => typeof code !== 'string')) {
      return null;
    }
    return {
      codes: parsed.codes as string[],
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
    };
  } catch {
    return null;
  }
}

/** Ghi (hoặc đè) nháp của tổ chức. */
export function writeDraft(orgId: string, codes: string[]): void {
  try {
    const draft: ModuleConfigDraft = { codes, savedAt: Date.now() };
    window.localStorage.setItem(draftKey(orgId), JSON.stringify(draft));
  } catch {
    // localStorage không dùng được — bỏ qua, chặn/chỉ báo lỗi thường là đủ.
  }
}

/** Xoá nháp (đã lưu thành công hoặc người dùng chọn bỏ nháp). */
export function clearDraft(orgId: string): void {
  try {
    window.localStorage.removeItem(draftKey(orgId));
  } catch {
    // Không xoá được thì để đó — lần sau hiển thị "Bỏ nháp" là xong.
  }
}
