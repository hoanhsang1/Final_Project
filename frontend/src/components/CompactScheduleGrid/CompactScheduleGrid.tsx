/**
 * Lịch tuần gọn 3 buổi × 7 ngày dùng chung cho lịch phòng ban và lịch cá nhân.
 *
 * Component chỉ lo render + điều hướng tuần + a11y; mọi phép tính buổi, ngày,
 * giờ, màu pastel và trạng thái hủy đều lấy từ helper thuần `compactSchedule.ts`.
 */
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import type { CompactSession } from '../../features/schedule/compactSchedule';
import { layoutCompactWeek } from '../../features/schedule/compactSchedule';
import { MSG_SCHEDULE } from '../../features/schedule/scheduleMessages';
import { shiftWeek, weekKeyOf } from '../../features/schedule/weeklyGrid';
import type { ScheduleItem } from '../../features/schedule/types';
import EmptyState from '../EmptyState/EmptyState';
import './CompactScheduleGrid.css';

export interface CompactScheduleGridProps {
  items: ScheduleItem[];
  initialWeek?: string;
  onSelect?: (item: ScheduleItem) => void;
  emptyText: string;
}

interface SessionButtonProps {
  dayLabel: string;
  dateLabel: string;
  buoiLabel: string;
  session: CompactSession;
  onSelect?: (item: ScheduleItem) => void;
}

function SessionButton({
  dayLabel,
  dateLabel,
  buoiLabel,
  session,
  onSelect,
}: SessionButtonProps) {
  const { item } = session;
  // Không có môn thì chỉ hiện lớp một lần, tránh "12A1, 12A1" trong aria-label.
  const title = item.subjectName
    ? `${item.subjectName} · ${item.className || '—'}`
    : item.className || item.classId;
  const labelTitle = item.subjectName
    ? `${item.subjectName}, ${item.className || '—'}`
    : item.className || item.classId || '—';
  const classes = ['compact-session', session.cancelled ? 'compact-session--cancelled' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      style={{ backgroundColor: session.color }}
      aria-label={`${dayLabel} ${dateLabel}, buổi ${buoiLabel}, ${session.timeLabel}, ${labelTitle}, ${
        item.teacherName || '—'
      }, ${item.roomCode || '—'}, ${item.status}`}
      onClick={onSelect ? () => onSelect(item) : undefined}
    >
      <span className="compact-session__time">
        {session.timeLabel} · {item.roomCode || '—'}
      </span>
      <span className="compact-session__title">{title}</span>
      <span className="compact-session__teacher">{item.teacherName || '—'}</span>
      {session.cancelled && (
        <span className="compact-session__ribbon" aria-hidden="true">
          {MSG_SCHEDULE.CANCELLED_RIBBON}
        </span>
      )}
    </button>
  );
}

export default function CompactScheduleGrid({
  items,
  initialWeek,
  onSelect,
  emptyText,
}: CompactScheduleGridProps) {
  const [weekStart, setWeekStart] = useState(
    () => initialWeek ?? weekKeyOf(items[0]?.startTime ?? new Date().toISOString()),
  );
  const layout = useMemo(() => layoutCompactWeek(items, weekStart), [items, weekStart]);

  if (items.length === 0) {
    return (
      <div className="compact-grid compact-grid--empty">
        <EmptyState description={emptyText} />
      </div>
    );
  }

  // Mỗi ngày luôn có đúng 3 buổi theo thứ tự SANG/CHIEU/TOI, nên lấy hàng từ ngày đầu.
  const buoiRows = layout.days[0].buoi;

  return (
    <section className="compact-grid" aria-label="Lịch tuần gọn">
      <div className="compact-grid__toolbar">
        <button
          type="button"
          className="compact-grid__nav"
          onClick={() => setWeekStart((week) => shiftWeek(week, -1))}
        >
          Tuần trước
        </button>
        <span className="compact-grid__week-label">
          Tuần {dayjs(layout.weekStart).format('DD/MM')}–
          {dayjs(layout.weekEnd).format('DD/MM/YYYY')}
        </span>
        <button
          type="button"
          className="compact-grid__nav"
          onClick={() => setWeekStart((week) => shiftWeek(week, 1))}
        >
          Tuần sau
        </button>
      </div>

      <div className="compact-grid__scroll">
        <table className="compact-grid__table">
          <thead>
            <tr>
              {/* Ô góc không phải tiêu đề cột: 7 cột còn lại là các ngày. */}
              <td className="compact-grid__corner" aria-hidden="true" />
              {layout.days.map((day) => (
                <th key={day.key} scope="col" className="compact-grid__day-head">
                  <span>{day.label}</span>
                  {/* Ngày chỉ là ngữ cảnh trực quan; tên cột vẫn đúng T2…CN cho SR. */}
                  <span className="compact-grid__date" aria-hidden="true">
                    {day.dateLabel}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {buoiRows.map((buoiRow, buoiIndex) => (
              <tr key={buoiRow.key}>
                <th scope="row" className="compact-grid__buoi-head">
                  {buoiRow.label}
                </th>
                {layout.days.map((day) => {
                  const buoi = day.buoi[buoiIndex];
                  return (
                    <td key={day.key} className="compact-grid__cell">
                      {buoi.sessions.length === 0 ? (
                        <span className="compact-grid__empty" aria-hidden="true">
                          —
                        </span>
                      ) : (
                        buoi.sessions.map((session) => (
                          <SessionButton
                            key={session.item.id}
                            dayLabel={day.label}
                            dateLabel={day.dateLabel}
                            buoiLabel={buoi.label}
                            session={session}
                            onSelect={onSelect}
                          />
                        ))
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
