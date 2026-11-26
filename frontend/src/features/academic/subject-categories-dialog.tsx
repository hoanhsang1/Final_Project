import { Check, Pencil, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/input'
import { useSubjectCategories, useSubjectCategoryMutations } from '@/features/academic/hooks'
import type { SubjectCategory } from '@/features/academic/types'
import { ApiError } from '@/lib/api-error'

/** Quản lý danh mục môn học: thêm, đổi tên, ngừng/kích hoạt. */
export function SubjectCategoriesDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [includeInactive, setIncludeInactive] = useState(false)
  const categories = useSubjectCategories(includeInactive)
  const mutations = useSubjectCategoryMutations()

  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<SubjectCategory | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (open) return
    setNewName('')
    setEditing(null)
    setError(undefined)
  }, [open])

  const create = () => {
    const name = newName.trim()
    if (!name) {
      setError('Vui lòng nhập tên danh mục.')
      return
    }
    mutations.create.mutate(name, {
      onSuccess: () => {
        setNewName('')
        setError(undefined)
        toast.success('Đã thêm danh mục môn học.')
      },
      onError: (cause) => setError(ApiError.from(cause).message || 'Không lưu được danh mục.'),
    })
  }

  const saveRename = () => {
    if (!editing) return
    const name = editName.trim()
    if (!name) {
      setError('Vui lòng nhập tên danh mục.')
      return
    }
    mutations.update.mutate(
      { id: editing.id, name },
      {
        onSuccess: () => {
          setEditing(null)
          setError(undefined)
          toast.success('Đã đổi tên danh mục.')
        },
        onError: (cause) => setError(ApiError.from(cause).message || 'Không lưu được danh mục.'),
      },
    )
  }

  const toggle = (category: SubjectCategory) => {
    mutations.setActive.mutate(
      { id: category.id, active: !category.active },
      {
        onSuccess: (updated) =>
          toast.success(
            updated.active
              ? 'Đã kích hoạt lại danh mục.'
              : `Đã ngừng danh mục. ${updated.subjectCount} môn đang gắn danh mục này.`,
          ),
        onError: (cause) =>
          toast.error(ApiError.from(cause).message || 'Không cập nhật được danh mục.'),
      },
    )
  }

  const rows = categories.data ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Danh mục môn học</DialogTitle>
          <DialogDescription>
            Nhóm môn học theo lĩnh vực. Có thể ngừng một danh mục mà không ảnh hưởng môn đang gắn.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="flex items-end gap-2">
            <Field label="Thêm danh mục" className="flex-1">
              <Input
                value={newName}
                placeholder="VD: Lập trình"
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') create()
                }}
              />
            </Field>
            <Button
              onClick={create}
              isLoading={mutations.create.isPending}
              className="mb-0.5"
            >
              <Plus aria-hidden="true" />
              Thêm
            </Button>
          </div>

          {error ? <p className="text-sm text-danger-600">{error}</p> : null}

          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(event) => setIncludeInactive(event.target.checked)}
              className="size-4 rounded border-line-300"
            />
            Hiện cả danh mục đã ngừng
          </label>

          {categories.isLoading ? (
            <p className="py-6 text-center text-sm text-ink-500">Đang tải danh mục…</p>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-500">Chưa có danh mục nào.</p>
          ) : (
            <ul className="divide-y divide-line rounded-md border border-line">
              {rows.map((category) => (
                <li key={category.id} className="flex items-center gap-3 px-3 py-2">
                  {editing?.id === category.id ? (
                    <>
                      <Input
                        value={editName}
                        aria-label={`Tên mới cho ${category.name}`}
                        onChange={(event) => setEditName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') saveRename()
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={saveRename}
                        isLoading={mutations.update.isPending}
                      >
                        <Check aria-hidden="true" />
                        Lưu
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                        <X aria-hidden="true" />
                        Huỷ
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ink-900">{category.name}</p>
                        <p className="text-xs text-ink-500">{category.subjectCount} môn</p>
                      </div>
                      <Badge tone={category.active ? 'success' : 'neutral'} dot>
                        {category.active ? 'Đang dùng' : 'Ngừng dùng'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(category)
                          setEditName(category.name)
                          setError(undefined)
                        }}
                      >
                        <Pencil aria-hidden="true" />
                        Sửa
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        isLoading={
                          mutations.setActive.isPending &&
                          mutations.setActive.variables?.id === category.id
                        }
                        onClick={() => toggle(category)}
                      >
                        {category.active ? 'Ngừng dùng' : 'Kích hoạt'}
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
