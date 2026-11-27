export interface PageResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages?: number
}

export interface Specialty {
  id: string
  name: string
  categoryId?: string | null
}

export interface TeacherItem {
  userId: string
  staffCode: string | null
  fullName: string
  email: string | null
  phone: string | null
  departmentId: string
  specialties: Specialty[]
  contractType: string | null
  teachingStatus: string | null
  classCount: number
  noClass: boolean
  classLabel: string | null
}

export interface TeacherClass {
  id: string
  classCode: string
  name: string
  status: string
  closeState: string | null
  closeLabel: string | null
  needsReassignment: boolean
  reassignmentReason: string | null
}

export interface TeacherHistory {
  id: string
  action: string
  actorUserId: string | null
  actorName: string | null
  createdAt: string
  details: unknown
}

export interface TeacherDetail extends TeacherItem {
  positionIds: string[]
  classes: TeacherClass[]
  version: number
  createdAt: string | null
  updatedAt: string | null
  history: TeacherHistory[]
}

export interface TeacherUpdateInput {
  fullName: string
  email?: string
  phone?: string
  specialtyIds: string[]
  contractType?: 'CO_HUU' | 'THINH_GIANG'
  version: number
  confirm?: boolean
}

export interface Student {
  id: string
  orgId: string
  studentCode: string
  fullName: string
  dateOfBirth: string | null
  email: string | null
  phone: string | null
  status: string
  classId: string | null
  classCode: string | null
  className: string | null
  createdBy: string | null
  createdAt: string | null
  updatedAt: string | null
  accountUsername: string | null
  accountCreatedAt: string | null
}

export interface StudentInput {
  studentCode?: string
  fullName: string
  dateOfBirth?: string
  email?: string
  phone?: string
  status?: 'active' | 'inactive' | 'suspended'
}

export interface StudentAccount {
  studentId: string
  username: string
  temporaryPassword: string
}

export interface StudentClass {
  id: string
  classCode: string
  name: string
  academicYear: string | null
  startDate: string | null
  endDate: string | null
  status: string
  closeState: string | null
  teacherName: string | null
  subjectName: string | null
}

export interface ClassTeacher {
  id: string
  code: string | null
  fullName: string
}

export interface SchoolClass {
  id: string
  orgId: string
  classCode: string
  name: string
  academicYear: string | null
  startDate: string | null
  endDate: string | null
  status: string
  teacher: ClassTeacher | null
  closeState: string | null
  version: number
  studentCount: number
  createdBy: string | null
  createdAt: string | null
  updatedAt: string | null
  cancelReason: string | null
  closeRequestNote: string | null
  closeRejectReason: string | null
  needsReassignment: boolean
  reassignmentReason: string | null
  subjectId: string | null
  subjectName: string | null
  cancelState: string | null
  cancelRequestReason: string | null
}

export interface ClassInput {
  classCode: string
  name: string
  academicYear?: string
  subjectId?: string
  curriculumId?: string
  startDate?: string
  endDate?: string
}

export interface ClassUpdateInput {
  name: string
  academicYear?: string
  subjectId?: string
  startDate?: string
  endDate?: string
  version: number
}

export interface ClassStatusLog {
  id: string
  classId: string
  fromStatus: string | null
  toStatus: string
  reason: string | null
  changedBy: string | null
  changedAt: string
  actorName: string | null
}

export interface ClassCloseEvent {
  id: string
  classId: string
  action: string
  actorId: string | null
  actorName: string | null
  reason: string | null
  note: string | null
  createdAt: string
}

export type RoomRequirement = 'ANY' | 'COMPUTER'

export const ROOM_REQUIREMENT_LABELS: Record<RoomRequirement, string> = {
  ANY: 'Bất kỳ',
  COMPUTER: 'Phòng máy',
}

export interface Subject {
  id: string
  code: string | null
  name: string
  description: string | null
  active: boolean
  createdAt: string | null
  updatedAt: string | null
  categoryId?: string | null
  categoryName?: string | null
  roomRequirement?: RoomRequirement
}

export interface SubjectCategory {
  id: string
  name: string
  active: boolean
  subjectCount: number
  createdAt: string | null
  updatedAt: string | null
}

export interface SubjectInput {
  code?: string
  name: string
  description?: string
  categoryId?: string | null
  roomRequirement?: RoomRequirement
  confirm?: boolean
}

// ============================================================================
// Phase 1 — Academic Setup Types (D-01 to D-15)
// ============================================================================

/** D-04: Subject Request DTOs */
export interface SubjectCreateRequest {
  code?: string | null
  name: string
  description?: string | null
  categoryId?: string | null
  roomRequirement?: RoomRequirement
  confirm?: boolean
}

export interface SubjectUpdateRequest {
  code?: string | null
  name: string
  description?: string | null
  categoryId?: string | null
  roomRequirement?: RoomRequirement
  confirm?: boolean
}

export interface SubjectStatusUpdateRequest {
  active: boolean
}

/** Đề xuất kiểm tra mã môn học trùng lặp */
export interface SubjectCodeCheckResponse {
  code: string
  available: boolean
  existingId: string | null
}

/** Đề xuất lấy thông tin sử dụng môn học trong các lớp */
export interface SubjectUsageResponse {
  subjectId: string
  classesUsingSubject: number
  classIds?: string[]
  classSubjectsUsingSubject?: number
  classSubjects?: {
    classId: string
    classCode: string
    name: string
    status: string
  }[]
  curriculaUsingSubject?: number
  curricula?: { curriculumId: string; code: string; name: string }[]
}

// ----------------------------------------------------------------------------
// Curriculum Types (D-02, D-03, D-12, D-14)
// Không có học kỳ (termNo) trong Phase 1 (D-02)
// ----------------------------------------------------------------------------

export interface Curriculum {
  id: string
  orgId: string
  code: string
  name: string
  description: string | null
  gradeLevel: string | null
  majorCode: string | null
  isActive: boolean
  version: number
  subjectCount?: number
  createdAt: string | null
  updatedAt: string | null
}

export interface CurriculumSummary {
  id: string
  code: string
  name: string
  gradeLevel: string | null
  isActive: boolean
  version: number
  subjectCount: number
}

export interface CurriculumCreateRequest {
  code: string
  name: string
  description?: string | null
  gradeLevel?: string | null
  majorCode?: string | null
}

export interface CurriculumUpdateRequest {
  code: string
  name: string
  description?: string | null
  gradeLevel?: string | null
  majorCode?: string | null
  version: number
}

export interface CurriculumStatusUpdateRequest {
  active: boolean
}

// ----------------------------------------------------------------------------
// Curriculum Subject & Prerequisite Types (D-03, D-07)
// ----------------------------------------------------------------------------

export interface PrerequisiteSubject {
  subjectId: string
  subjectCode: string | null
  subjectName: string
}

export interface PrerequisiteSubjectIds {
  prerequisiteSubjectIds: string[]
}

export interface CurriculumSubject {
  curriculumId: string
  subjectId: string
  subjectCode: string | null
  subjectName: string
  sequenceNo: number
  requiredSessions: number
  sessionMinutes: number
  sessionsPerWeek: number | null
  theoryHours: number | null
  practiceHours: number | null
  isRequired: boolean
  notes: string | null
  prerequisiteSubjectIds: string[]
  prerequisites?: PrerequisiteSubject[]
}

export interface CurriculumSubjectCreateRequest {
  subjectId: string
  sequenceNo: number
  requiredSessions: number
  sessionMinutes: number
  sessionsPerWeek?: number | null
  theoryHours?: number | null
  practiceHours?: number | null
  isRequired?: boolean
  notes?: string | null
  prerequisiteSubjectIds?: string[]
}

export interface CurriculumSubjectUpdateRequest {
  sequenceNo: number
  requiredSessions: number
  sessionMinutes: number
  sessionsPerWeek?: number | null
  theoryHours?: number | null
  practiceHours?: number | null
  isRequired?: boolean
  notes?: string | null
  prerequisiteSubjectIds?: string[]
}

// ----------------------------------------------------------------------------
// Teacher Subject & Specialty Subject Types (D-06, D-06a)
// Teacher Subject mặc định APPROVED, không có luồng PENDING/Approve/Reject
// ----------------------------------------------------------------------------

export interface TeacherSubject {
  subjectId: string
  subjectCode: string | null
  subjectName: string
  status: 'APPROVED' | 'REVOKED'
  source: 'SPECIALTY' | 'MANUAL'
  createdAt?: string | null
}

export interface TeacherSubjectListResponse {
  userId: string
  version: number // staff_profile.version
  items: TeacherSubject[]
}

export interface TeacherSubjectCreateRequest {
  subjectId: string
  source?: 'MANUAL' | 'SPECIALTY'
}

export interface TeacherSubjectUpdateRequest {
  subjectIds: string[]
  version: number // staff_profile.version
  confirmRevokeInUse?: boolean
}

export interface SpecialtySubject {
  specialtyId: string
  subjectIds: string[]
}

export interface SpecialtySubjectUpdateRequest {
  subjectIds: string[]
}

// ----------------------------------------------------------------------------
// Teacher eligibility — quy tắc D1 dùng chung cho mọi màn hình
// ----------------------------------------------------------------------------

/** Lý do giáo viên dạy được môn: cùng danh mục chuyên môn hoặc ngoại lệ được duyệt. */
export type TeacherSubjectReason = 'CATEGORY' | 'EXCEPTION'

export const TEACHER_SUBJECT_REASON_LABELS: Record<TeacherSubjectReason, string> = {
  CATEGORY: 'Cùng danh mục chuyên môn',
  EXCEPTION: 'Ngoại lệ được duyệt',
}

export interface TeachableSubject {
  subjectId: string
  subjectCode: string | null
  subjectName: string
  reason: TeacherSubjectReason
}

export interface EligibleTeacher {
  userId: string
  fullName: string
  departmentId: string
}

// ----------------------------------------------------------------------------
// Class Subject Types (D-01, D-08, D-09, D-15)
// ----------------------------------------------------------------------------

export type ClassSubjectSource = 'CURRICULUM' | 'MANUAL' | 'LEGACY'
export type ClassSubjectStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface ClassSubject {
  classId: string
  subjectId: string
  subjectCode: string | null
  subjectName: string
  source: ClassSubjectSource
  curriculumId: string | null
  requiredSessions: number | null
  plannedSessions: number | null
  sessionMinutes: number | null
  sessionsPerWeek: number | null
  stageNo: number
  teacherId: string | null
  teacherName: string | null
  isPrimary: boolean
  status: ClassSubjectStatus
}

export interface ClassSubjectListResponse {
  classId: string
  curriculumId: string | null
  subjects: ClassSubject[]
}

export interface ClassSubjectCreateRequest {
  subjectId: string
  plannedSessions: number
  sessionMinutes: number
  sessionsPerWeek?: number | null
  stageNo?: number | null
  teacherId?: string | null
}

export interface ClassSubjectUpdateRequest {
  plannedSessions?: number
  sessionMinutes?: number
  sessionsPerWeek?: number
  stageNo?: number
  teacherId?: string | null
  version: number // school_class.version
}

export interface ApplyCurriculumRequest {
  curriculumId: string
  confirmReplace?: boolean
  keepManualSubjects?: boolean
  version: number // school_class.version
}

export interface PrimarySubjectChangeRequest {
  subjectId: string
  reason: string
  expectedVersion: number // school_class.version
  operationId: string // client-generated UUID v4
  plannedSessions?: number | null
  sessionMinutes?: number | null
}

export interface PrimarySubjectChangeResponse {
  classId: string
  subjectId: string
  subjectName: string
  version: number
  historyId: string
  operationId: string
}

export interface ClassSubjectHistory {
  id: string
  classId: string
  oldSubjectId: string | null
  oldSubjectCode: string | null
  oldSubjectName: string | null
  oldTeacherId: string | null
  oldTeacherName: string | null
  oldSource: ClassSubjectSource | null
  newSubjectId: string
  newSubjectCode: string | null
  newSubjectName: string
  newSource: ClassSubjectSource
  reason: string
  operationId: string
  changedBy: string
  changedByName?: string | null
  changedAt: string
}

export interface ClassSubjectHistoryResponse {
  items: ClassSubjectHistory[]
  total: number
  page: number // 0-based
  size: number
  pages?: number
}

export const CLASS_SUBJECT_SOURCE_LABELS: Record<ClassSubjectSource, string> = {
  CURRICULUM: 'Chương trình',
  MANUAL: 'Thủ công',
  LEGACY: 'Kế thừa',
}

export const CLASS_SUBJECT_STATUS_LABELS: Record<ClassSubjectStatus, string> = {
  PLANNED: 'Kế hoạch',
  IN_PROGRESS: 'Đang diễn ra',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã huỷ',
}

export const CLASS_STATUS_LABELS: Record<string, string> = {
  CHUA_BAT_DAU: 'Chưa bắt đầu',
  DANG_DIEN_RA: 'Đang diễn ra',
  DA_KET_THUC: 'Đã kết thúc',
  DA_HUY: 'Đã huỷ',
}

export const CLOSE_STATE_LABELS: Record<string, string> = {
  NONE: 'Bình thường',
  PENDING: 'Chờ duyệt đóng',
  CLOSED: 'Đã đóng',
  REJECTED: 'Bị từ chối đóng',
}

export const CANCEL_STATE_LABELS: Record<string, string> = {
  NONE: 'Bình thường',
  PENDING: 'Chờ duyệt huỷ',
  APPROVED: 'Đã huỷ',
  REJECTED: 'Bị từ chối huỷ',
}

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  CO_HUU: 'Cơ hữu',
  THINH_GIANG: 'Thỉnh giảng',
}

export const TEACHING_STATUS_LABELS: Record<string, string> = {
  DANG_DAY: 'Đang dạy',
  TAM_NGHI: 'Tạm nghỉ',
  NGHI_VIEC: 'Đã nghỉ',
}

export const STUDENT_STATUS_LABELS: Record<string, string> = {
  active: 'Đang học',
  inactive: 'Tạm dừng',
  suspended: 'Đình chỉ',
}
