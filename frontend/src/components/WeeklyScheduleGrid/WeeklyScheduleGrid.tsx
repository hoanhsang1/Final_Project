/**
 * Lưới tuần 07:00–20:00 dùng chung cho lịch phòng ban và lịch cá nhân.
 *
 * Component chỉ lo render + điều hướng tuần + a11y; mọi phép tính vị trí, lane,
 * màu pastel và ngày trong tuần đều lấy từ helper thuần `weeklyGrid.ts`.
 */
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import type { PositionedSession } from '../../features/schedule/weeklyGrid';
import {
  GRID_END_HOUR,
  GRID_START_HOUR,
  HOUR_HEIGHT_PX,
  isCancelledStatus,
  layoutWeek,
  pastelFor,
  shiftWeek,
  weekKeyOf,
} from '../../features/schedule/weeklyGrid';
import type { ScheduleItem } from '../../features/schedule/types';
import EmptyState from '../EmptyState/EmptyState';
import './WeeklyScheduleGrid.css';

export interface WeeklyScheduleGridProps {
  items: ScheduleItem[];
  initialWeek?: string;
  onSelect?: (item: ScheduleItem) => void;
  /** Ẩn giáo viên trên khối; `aria-label` luôn giữ tên giáo viên. Mặc định `true`. */
  showTeacher?: boolean;
  emptyText: string;
}

/** 14 mốc giờ (07:00…20:00) cho 13 khoảng 56px của lưới. */
const HOUR_LABELS = Array.from(
  { length: GRID_END_HOUR - GRID_START_HOUR + 1 },
  (_, index) => `${String(GRID_START_HOUR + index).padStart(2, '0')}:00`,
);

const timeOf = (value: string): string => dayjs(value).format('HH:mm');

const labelOf = (item: ScheduleItem): string =>
  `${timeOf(item.startTime)}–${timeOf(item.endTime)}, ${
    item.subjectName || item.className || item.classId
  }, ${item.className || '—'}, ${item.teacherName || '—'}, ${item.roomCode || '—'}, ${item.status}`;

interface ScheduleBlockProps {
  session: PositionedSession;
  showTeacher: boolean;
  onSelect?: (item: ScheduleItem) => void;
}

function ScheduleBlock({ session, showTeacher, onSelect }: ScheduleBlockProps) {
  const { item } = session;
  const classes = [
    'weekly-block',
    isCancelledStatus(item.status) ? 'weekly-block--cancelled' : '',
    session.clipped ? 'weekly-block--clipped' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const laneWidth = 100 / session.laneCount;

  return (
    <button
      type="button"
      className={classes}
      style={{
        top: `${session.topPercent}%`,
        height: `${session.heightPercent}%`,
        left: `calc(${session.lane * laneWidth}% + 2px)`,
        width: `calc(${laneWidth}% - 4px)`,
        backgroundColor: pastelFor(item),
      }}
      aria-label={labelOf(item)}
      onClick={onSelect ? () => onSelect(item) : undefined}
    >
      <span className="weekly-block__time">
        {timeOf(item.startTime)}–{timeOf(item.endTime)}
      </span>
      <span className="weekly-block__title">
        {item.subjectName || item.className || item.classId}
      </span>
      {item.className && <span className="weekly-block__class">{item.className}</span>}
      {showTeacher && (
        <span className="weekly-block__teacher">{item.teacherName || '—'}</span>
      )}
      <span className="weekly-block__room">{item.roomCode || '—'}</span>
    </button>
  );
}

export default function WeeklyScheduleGrid({
  items,
  initialWeek,
  onSelect,
  showTeacher = true,
  emptyText,
}: WeeklyScheduleGridProps) {
  const [weekStart, setWeekStart] = useState(
    () => initialWeek ?? weekKeyOf(items[0]?.startTime ?? new Date().toISOString()),
  );
  const layout = useMemo(() => layoutWeek(items, weekStart), [items, weekStart]);

  if (items.length === 0) {
    return (
      <div className="weekly-grid weekly-grid--empty">
        <EmptyState description={emptyText} />
      </div>
    );
  }

  return (
    <section className="weekly-grid" aria-label="Lịch tuần">
      <div className="weekly-grid__toolbar">
        <button
          type="button"
          className="weekly-grid__nav"
          onClick={() => setWeekStart((week) => shiftWeek(week, -1))}
        >
          Tuần trước
        </button>
        <span className="weekly-grid__week-label">
          Tuần {dayjs(layout.weekStart).format('DD/MM')}–{dayjs(layout.weekEnd).format('DD/MM/YYYY')}
        </span>
        <button
          type="button"
          className="weekly-grid__nav"
          onClick={() => setWeekStart((week) => shiftWeek(week, 1))}
        >
          Tuần sau
        </button>
      </div>

      {layout.outOfRangeCount > 0 && (
        <details className="weekly-grid__out-of-range">
          <summary>{layout.outOfRangeCount} buổi ngoài khung giờ</summary>
          <p>
            Các buổi này vẫn được hiển thị nhưng kẹp về mép lưới {HOUR_LABELS[0]}–
            {HOUR_LABELS[HOUR_LABELS.length - 1]}.
          </p>
        </details>
      )}

      <div className="weekly-grid__scroll">
        <table className="weekly-grid__table">
          <thead>
            <tr>
              <th scope="col" aria-label="Giờ" className="weekly-grid__hour-head" />
              {layout.days.map((day) => (
                <th key={day.key} scope="col" className="weekly-grid__day-head">
                  <span>{day.label}</span>
                  {/* Ngày chỉ là ngữ cảnh trực quan; tên cột vẫn đúng T2…CN cho SR. */}
                  <span className="weekly-grid__date" aria-hidden="true">
                    {day.dateLabel}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className="weekly-grid__hour-column">
                {HOUR_LABELS.map((label, index) => (
                  <span
                    key={label}
                    className="weekly-grid__hour-label"
                    style={{ top: `${index * HOUR_HEIGHT_PX}px` }}
                  >
                    {label}
                  </span>
                ))}
              </th>
              {layout.days.map((day) => (
                <td key={day.key} className="weekly-grid__cell">
                  {day.sessions.map((session) => (
                    <ScheduleBlock
                      key={session.item.id}
                      session={session}
                      showTeacher={showTeacher}
                      onSelect={onSelect}
                    />
                  ))}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
