import { DoorOpen, Pencil, Plus, Trash2, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable, type DataColumn } from '@/components/ui/data-table'
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
import { PageHeader } from '@/components/ui/page-header'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorState } from '@/components/ui/states'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageContainer } from '@/components/layout/page-container'
import { usePermission } from '@/features/auth/hooks'
import {
  useEquipment,
  useFacilityMutations,
  useIssues,
  useRooms,
} from '@/features/facility/hooks'
import {
  EQUIPMENT_STATUS_LABELS,
  ROOM_STATUS_LABELS,
  ROOM_TYPE_LABELS,
  type Equipment,
  type EquipmentInput,
  type Room,
  type RoomInput,
} from '@/features/facility/types'
import { useDepartments } from '@/features/organization/hooks'
import { useDepartmentScope } from '@/features/organization/use-scope'
import { ApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/format'
import { PERM } from '@/lib/permissions'

const EMPTY_ROOM: RoomInput = {
  code: '',
  name: '',
  building: '',
  floor: '',
  capacity: 30,
  roomType: 'classroom',
  status: 'active',
}

const EMPTY_EQUIPMENT: EquipmentInput = {
  assetCode: '',
  name: '',
  equipmentType: '',
  roomId: 'none',
  status: 'in_use',
}

function RoomDialog({
  open,
  onOpenChange,
  departmentId,
  room,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  departmentId: string
  room: Room | null
}) {
  const mutations = useFacilityMutations(departmentId)
  const [form, setForm] = useState<RoomInput>(EMPTY_ROOM)
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!open) return
    setForm(
      room
        ? {
            code: room.code,
            name: room.name,
            building: room.building ?? '',
            floor: room.floor ?? '',
            capacity: room.capacity,
            roomType: room.roomType ?? 'classroom',
            status: room.status,
          }
        : EMPTY_ROOM,
    )
    setError(undefined)
  }, [open, room])

  const submit = () => {
    setError(undefined)
    if (!form.code.trim() || !form.name.trim()) {
      setError('Vui lòng nhập mã và tên phòng.')
      return
    }
    if (!form.capacity || form.capacity < 1) {
      setError('Sức chứa phải lớn hơn 0.')
      return
    }
    const handlers = {
      onSuccess: () => {
        toast.success(room ? 'Đã cập nhật phòng.' : 'Đã tạo phòng.')
        onOpenChange(false)
      },
      onError: (cause: unknown) => setError(ApiError.from(cause).message || 'Không lưu được phòng.'),
    }
    if (room) mutations.updateRoom.mutate({ id: room.id, input: form }, handlers)
    else mutations.createRoom.mutate(form, handlers)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{room ? 'Cập nhật phòng' : 'Thêm phòng học'}</DialogTitle>
          <DialogDescription>Phòng thuộc phòng ban hiện tại và dùng cho xếp lịch.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mã phòng" required>
              <Input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
            </Field>
            <Field label="Tên phòng" required>
              <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </Field>
            <Field label="Toà nhà">
              <Input
                value={form.building ?? ''}
                onChange={(event) => setForm({ ...form, building: event.target.value })}
              />
            </Field>
            <Field label="Tầng">
              <Input
                value={form.floor ?? ''}
                onChange={(event) => setForm({ ...form, floor: event.target.value })}
              />
            </Field>
            <Field label="Sức chứa" required>
              <Input
                type="number"
                min={1}
                value={form.capacity}
                onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })}
              />
            </Field>
            <Field label="Loại phòng">
              <Select
                value={form.roomType ?? 'classroom'}
                onValueChange={(value) => setForm({ ...form, roomType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classroom">Phòng học</SelectItem>
                  <SelectItem value="computer_room">Phòng máy</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Trạng thái">
              <Select
                value={form.status ?? 'active'}
                onValueChange={(value) => setForm({ ...form, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Đang sử dụng</SelectItem>
                  <SelectItem value="maintenance">Đang bảo trì</SelectItem>
                  <SelectItem value="closed">Đã đóng</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          {error ? <p className="text-sm text-danger-600">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={submit} isLoading={mutations.createRoom.isPending || mutations.updateRoom.isPending}>
            {room ? 'Lưu thay đổi' : 'Tạo phòng'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EquipmentDialog({
  open,
  onOpenChange,
  departmentId,
  equipment,
  rooms,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  departmentId: string
  equipment: Equipment | null
  rooms: Room[]
}) {
  const mutations = useFacilityMutations(departmentId)
  const [form, setForm] = useState<EquipmentInput>(EMPTY_EQUIPMENT)
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!open) return
    setForm(
      equipment
        ? {
            assetCode: equipment.assetCode,
            name: equipment.name,
            equipmentType: equipment.equipmentType ?? '',
            roomId: equipment.roomId ?? 'none',
            status: equipment.status,
            purchaseDate: equipment.purchaseDate ?? undefined,
          }
        : EMPTY_EQUIPMENT,
    )
    setError(undefined)
  }, [open, equipment])

  const submit = () => {
    setError(undefined)
    if (!form.assetCode.trim() || !form.name.trim()) {
      setError('Vui lòng nhập mã tài sản và tên thiết bị.')
      return
    }
    const input: EquipmentInput = {
      ...form,
      roomId: form.roomId === 'none' ? undefined : form.roomId,
    }
    const handlers = {
      onSuccess: () => {
        toast.success(equipment ? 'Đã cập nhật thiết bị.' : 'Đã thêm thiết bị.')
        onOpenChange(false)
      },
      onError: (cause: unknown) =>
        setError(ApiError.from(cause).message || 'Không lưu được thiết bị.'),
    }
    if (equipment) mutations.updateEquipment.mutate({ id: equipment.id, input }, handlers)
    else mutations.createEquipment.mutate(input, handlers)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{equipment ? 'Cập nhật thiết bị' : 'Thêm thiết bị'}</DialogTitle>
          <DialogDescription>Thiết bị gắn với một phòng để theo dõi sự cố.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mã tài sản" required>
              <Input
                value={form.assetCode}
                onChange={(event) => setForm({ ...form, assetCode: event.target.value })}
              />
            </Field>
            <Field label="Tên thiết bị" required>
              <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </Field>
            <Field label="Loại thiết bị">
              <Input
                value={form.equipmentType ?? ''}
                onChange={(event) => setForm({ ...form, equipmentType: event.target.value })}
              />
            </Field>
            <Field label="Phòng">
              <Select
                value={form.roomId ?? 'none'}
                onValueChange={(value) => setForm({ ...form, roomId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn phòng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Chưa gán phòng</SelectItem>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.code} · {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Trạng thái">
              <Select
                value={form.status ?? 'in_use'}
                onValueChange={(value) => setForm({ ...form, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_use">Đang sử dụng</SelectItem>
                  <SelectItem value="broken">Hỏng</SelectItem>
                  <SelectItem value="maintenance">Bảo trì</SelectItem>
                  <SelectItem value="in_storage">Trong kho</SelectItem>
                  <SelectItem value="retired">Đã thanh lý</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Ngày mua">
              <Input
                type="date"
                value={form.purchaseDate ?? ''}
                onChange={(event) => setForm({ ...form, purchaseDate: event.target.value || undefined })}
              />
            </Field>
          </div>
          {error ? <p className="text-sm text-danger-600">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button
            onClick={submit}
            isLoading={mutations.createEquipment.isPending || mutations.updateEquipment.isPending}
          >
            {equipment ? 'Lưu thay đổi' : 'Thêm thiết bị'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function FacilityPage() {
  const { can } = usePermission()
  const scope = useDepartmentScope()
  const departments = useDepartments()
  const [departmentId, setDepartmentId] = useState('')
  const [roomDialog, setRoomDialog] = useState<{ open: boolean; room: Room | null }>({
    open: false,
    room: null,
  })
  const [equipmentDialog, setEquipmentDialog] = useState<{ open: boolean; item: Equipment | null }>({
    open: false,
    item: null,
  })
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null)
  const [deletingEquipment, setDeletingEquipment] = useState<Equipment | null>(null)

  useEffect(() => {
    if (!scope.isScoped && !departmentId && departments.data?.length) {
      setDepartmentId(departments.data[0]!.id)
    }
  }, [scope.isScoped, departmentId, departments.data])

  const effectiveDepartmentId = scope.isScoped ? scope.departmentId : departmentId || null
  const rooms = useRooms(effectiveDepartmentId)
  const equipment = useEquipment(effectiveDepartmentId)
  const issues = useIssues(effectiveDepartmentId)
  const mutations = useFacilityMutations(effectiveDepartmentId)

  const roomRows = rooms.data ?? []
  const equipmentRows = equipment.data ?? []
  const openIssues = (issues.data ?? []).filter((issue) => issue.status !== 'resolved').length

  const roomColumns: DataColumn<Room>[] = [
    {
      id: 'code',
      header: 'Phòng',
      cell: (row) => (
        <div>
          <p className="font-medium text-ink-900">{row.code}</p>
          <p className="text-xs text-ink-500">{row.name}</p>
        </div>
      ),
      sortValue: (row) => row.code,
    },
    {
      id: 'building',
      header: 'Vị trí',
      hideBelow: 'md',
      cell: (row) => [row.building, row.floor].filter(Boolean).join(' · ') || '—',
    },
    {
      id: 'type',
      header: 'Loại',
      hideBelow: 'lg',
      cell: (row) => (row.roomType ? ROOM_TYPE_LABELS[row.roomType] ?? row.roomType : '—'),
    },
    {
      id: 'capacity',
      header: 'Sức chứa',
      align: 'right',
      cell: (row) => row.capacity,
      sortValue: (row) => row.capacity,
    },
    {
      id: 'status',
      header: 'Trạng thái',
      cell: (row) => (
        <Badge tone={row.status === 'active' ? 'success' : row.status === 'maintenance' ? 'warning' : 'neutral'} dot>
          {ROOM_STATUS_LABELS[row.status] ?? row.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          {can(PERM.facilityRoomUpdate) || can(PERM.facilityManage) ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRoomDialog({ open: true, room: row })}
            >
              <Pencil aria-hidden="true" />
              Sửa
            </Button>
          ) : null}
          {can(PERM.facilityRoomDelete) || can(PERM.facilityManage) ? (
            <Button variant="ghost" size="sm" onClick={() => setDeletingRoom(row)}>
              <Trash2 aria-hidden="true" />
              Xoá
            </Button>
          ) : null}
        </div>
      ),
    },
  ]

  const equipmentColumns: DataColumn<Equipment>[] = [
    {
      id: 'asset',
      header: 'Thiết bị',
      cell: (row) => (
        <div>
          <p className="font-medium text-ink-900">{row.name}</p>
          <p className="text-xs text-ink-500">{row.assetCode}</p>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    {
      id: 'type',
      header: 'Loại',
      hideBelow: 'md',
      cell: (row) => row.equipmentType ?? '—',
    },
    {
      id: 'room',
      header: 'Phòng',
      hideBelow: 'md',
      cell: (row) => row.roomName ?? '—',
    },
    {
      id: 'purchase',
      header: 'Ngày mua',
      hideBelow: 'lg',
      cell: (row) => formatDate(row.purchaseDate),
    },
    {
      id: 'status',
      header: 'Trạng thái',
      cell: (row) => (
        <Badge
          tone={
            row.status === 'in_use'
              ? 'success'
              : row.status === 'broken'
                ? 'danger'
                : row.status === 'maintenance'
                  ? 'warning'
                  : 'neutral'
          }
          dot
        >
          {EQUIPMENT_STATUS_LABELS[row.status] ?? row.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          {can(PERM.facilityEquipmentUpdate) || can(PERM.facilityManage) ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEquipmentDialog({ open: true, item: row })}
            >
              <Pencil aria-hidden="true" />
              Sửa
            </Button>
          ) : null}
          {can(PERM.facilityEquipmentDelete) || can(PERM.facilityManage) ? (
            <Button variant="ghost" size="sm" onClick={() => setDeletingEquipment(row)}>
              <Trash2 aria-hidden="true" />
              Xoá
            </Button>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Đào tạo · Cơ sở vật chất"
        title="Phòng & thiết bị"
        description="Quản lý phòng học, thiết bị và tình trạng sự cố theo phòng ban."
        actions={
          <Link to="/dao-tao/co-so-vat-chat/su-co">
            <Button variant="outline" size="sm">
              <Wrench aria-hidden="true" />
              Sự cố ({openIssues})
            </Button>
          </Link>
        }
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
              <DoorOpen className="size-3.5" aria-hidden="true" />
              {roomRows.length} phòng
            </span>
            <span className="text-xs text-ink-500">{equipmentRows.length} thiết bị</span>
          </>
        }
      />

      {!scope.isScoped ? (
        <div className="mt-5">
          <Field label="Phòng ban" labelSize="sm">
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger className="sm:w-60">
                <SelectValue placeholder="Chọn phòng ban" />
              </SelectTrigger>
              <SelectContent>
                {(departments.data ?? []).map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      ) : null}

      {!effectiveDepartmentId ? (
        <p className="mt-6 text-sm text-ink-500">Chọn phòng ban để xem cơ sở vật chất.</p>
      ) : (
        <Tabs defaultValue="rooms" className="mt-5">
          <TabsList>
            <TabsTrigger value="rooms">Phòng học</TabsTrigger>
            <TabsTrigger value="equipment">Thiết bị</TabsTrigger>
          </TabsList>
          <TabsContent value="rooms">
            <div className="mb-3 flex justify-end">
              {can(PERM.facilityRoomCreate) || can(PERM.facilityManage) ? (
                <Button size="sm" onClick={() => setRoomDialog({ open: true, room: null })}>
                  <Plus aria-hidden="true" />
                  Thêm phòng
                </Button>
              ) : null}
            </div>
            <DataTable
              columns={roomColumns}
              data={roomRows}
              rowKey={(row) => row.id}
              isLoading={rooms.isLoading}
              error={
                rooms.isError ? (
                  <ErrorState
                    title="Không tải được danh sách phòng"
                    description={ApiError.from(rooms.error).message}
                    onRetry={() => void rooms.refetch()}
                  />
                ) : undefined
              }
              empty={<p className="py-8 text-center text-sm text-ink-500">Chưa có phòng nào.</p>}
              initialPageSize={20}
            />
          </TabsContent>
          <TabsContent value="equipment">
            <div className="mb-3 flex justify-end">
              {can(PERM.facilityEquipmentCreate) || can(PERM.facilityManage) ? (
                <Button size="sm" onClick={() => setEquipmentDialog({ open: true, item: null })}>
                  <Plus aria-hidden="true" />
                  Thêm thiết bị
                </Button>
              ) : null}
            </div>
            <DataTable
              columns={equipmentColumns}
              data={equipmentRows}
              rowKey={(row) => row.id}
              isLoading={equipment.isLoading}
              error={
                equipment.isError ? (
                  <ErrorState
                    title="Không tải được danh sách thiết bị"
                    description={ApiError.from(equipment.error).message}
                    onRetry={() => void equipment.refetch()}
                  />
                ) : undefined
              }
              empty={<p className="py-8 text-center text-sm text-ink-500">Chưa có thiết bị nào.</p>}
              initialPageSize={20}
            />
          </TabsContent>
        </Tabs>
      )}

      {effectiveDepartmentId ? (
        <>
          <RoomDialog
            open={roomDialog.open}
            onOpenChange={(open) => setRoomDialog({ open, room: open ? roomDialog.room : null })}
            departmentId={effectiveDepartmentId}
            room={roomDialog.room}
          />
          <EquipmentDialog
            open={equipmentDialog.open}
            onOpenChange={(open) =>
              setEquipmentDialog({ open, item: open ? equipmentDialog.item : null })
            }
            departmentId={effectiveDepartmentId}
            equipment={equipmentDialog.item}
            rooms={roomRows}
          />
        </>
      ) : null}

      <ConfirmDialog
        open={Boolean(deletingRoom)}
        onOpenChange={(open) => !open && setDeletingRoom(null)}
        title="Xoá phòng"
        description={`Xoá phòng ${deletingRoom?.code ?? ''}? Phòng đang gắn thiết bị sẽ không xoá được.`}
        confirmLabel="Xoá"
        tone="danger"
        onConfirm={() => {
          if (!deletingRoom) return
          mutations.deleteRoom.mutate(deletingRoom.id, {
            onSuccess: () => {
              toast.success('Đã xoá phòng.')
              setDeletingRoom(null)
            },
            onError: (cause) =>
              toast.error(ApiError.from(cause).message || 'Không xoá được phòng.'),
          })
        }}
      />
      <ConfirmDialog
        open={Boolean(deletingEquipment)}
        onOpenChange={(open) => !open && setDeletingEquipment(null)}
        title="Xoá thiết bị"
        description={`Xoá thiết bị ${deletingEquipment?.name ?? ''}? Thao tác không thể hoàn tác.`}
        confirmLabel="Xoá"
        tone="danger"
        onConfirm={() => {
          if (!deletingEquipment) return
          mutations.deleteEquipment.mutate(deletingEquipment.id, {
            onSuccess: () => {
              toast.success('Đã xoá thiết bị.')
              setDeletingEquipment(null)
            },
            onError: (cause) =>
              toast.error(ApiError.from(cause).message || 'Không xoá được thiết bị.'),
          })
        }}
      />
    </PageContainer>
  )
}
