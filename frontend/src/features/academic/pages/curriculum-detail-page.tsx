import { useParams } from 'react-router-dom'

import { BackendDependencyPage } from '@/routes/backend-dependency-page'

/**
 * Placeholder page cho Screen 3 & 4 — Curriculum Subject & Prerequisite.
 * Sẽ được triển khai UI hoàn chỉnh ở các bước tiếp theo sau khi foundation sẵn sàng.
 */
export function CurriculumDetailPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <BackendDependencyPage
      eyebrow="Đào tạo · Chi tiết chương trình"
      title={`Chi tiết chương trình đào tạo ${id ? `(${id})` : ''}`}
      description="Quản lý danh sách môn học, số buổi, giờ lý thuyết/thực hành và môn tiên quyết."
      missing={[
        'GET /api/curricula/{id}/subjects (Danh sách môn trong CTĐT)',
        'POST /api/curricula/{id}/subjects (Thêm môn vào CTĐT)',
        'PUT /api/curricula/{id}/subjects/{subjectId} (Cập nhật môn và tiên quyết)',
        'DELETE /api/curricula/{id}/subjects/{subjectId} (Xoá môn khỏi CTĐT)',
      ]}
      available={[{ label: 'Danh sách CTĐT', to: '/dao-tao/chuong-trinh-dao-tao' }]}
    />
  )
}
