import { BackendDependencyPage } from '@/routes/backend-dependency-page'

/**
 * Placeholder page cho Screen 2 — Curriculum Management.
 * Sẽ được triển khai UI hoàn chỉnh ở các bước tiếp theo sau khi foundation sẵn sàng.
 */
export function CurriculaPage() {
  return (
    <BackendDependencyPage
      eyebrow="Đào tạo · Chương trình đào tạo"
      title="Chương trình đào tạo"
      description="Quản lý khung chương trình đào tạo, môn học và môn tiên quyết theo tổ chức."
      missing={[
        'GET /api/curricula (Danh sách CTĐT)',
        'POST /api/curricula (Tạo CTĐT)',
        'GET /api/curricula/{id} (Chi tiết CTĐT)',
        'PUT /api/curricula/{id} (Cập nhật CTĐT)',
        'PATCH /api/curricula/{id}/status (Đổi trạng thái)',
      ]}
      available={[{ label: 'Môn học', to: '/dao-tao/mon-hoc' }]}
    />
  )
}
