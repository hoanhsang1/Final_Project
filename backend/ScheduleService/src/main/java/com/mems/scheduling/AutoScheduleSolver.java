package com.mems.scheduling;

import com.mems.dto.SessionRequirement;
import com.mems.schedule.ClassSlotRule;
import com.mems.schedule.ScheduleRules;
import com.mems.schedule.TeacherAvailability;
import com.mems.schedule.TimeRange;
import com.mems.schedule.TimeSlot;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

/**
 * Bộ xếp lịch thuần: chỉ nhận dữ liệu đã chuẩn bị, không gọi DB/HTTP.
 * <p>
 * Giai đoạn 1 chọn khung tuần (thứ, tiết bắt đầu, phòng, giáo viên) bằng quay lui + MRV
 * cho từng giai đoạn của lớp; giai đoạn 2 bung khung ra từng ngày và sửa ô lỗi theo thứ
 * tự đổi phòng → đổi tiết → đổi ngày, giáo viên không đổi.
 */
@Component
public final class AutoScheduleSolver {

    public SolverResult solve(SolverInput input) {
        long started = System.nanoTime();
        Execution execution = new Execution(input, started + input.options().maxMillis() * 1_000_000L);
        execution.run();
        long elapsed = Math.max(0L, (System.nanoTime() - started) / 1_000_000L);
        boolean complete = !execution.timedOut && execution.unscheduled.isEmpty();
        return new SolverResult(execution.placements, execution.unscheduled,
            new SolverStats(execution.steps, elapsed, execution.exceptionCount, complete));
    }

    private static int stageNo(SessionRequirement requirement) {
        return requirement.stageNo() > 0 ? requirement.stageNo() : 1;
    }

    private static int resolvePerWeek(SessionRequirement requirement) {
        return Math.max(1, requirement.sessionsPerWeek());
    }

    private static boolean isComputerRequirement(SessionRequirement requirement) {
        return "COMPUTER".equalsIgnoreCase(requirement.roomRequirement());
    }

    private static String subjectLabel(SessionRequirement requirement) {
        return Diagnostics.name(requirement);
    }

    private record Coverage(int passed, int total) {
        double ratio() {
            return total == 0 ? 0d : passed / (double) total;
        }
    }

    private static final class Attempt {
        LocalDate date;
        List<Integer> periods;
        String roomId;
        String teacherId;
        TimeRange range;
        String exceptionType;
        String exceptionReason;

        boolean isException() {
            return exceptionType != null;
        }

        Attempt withException(String type, String reason) {
            this.exceptionType = type;
            this.exceptionReason = reason;
            return this;
        }
    }

    private static final class ResultPlan {
        final SessionRequirement requirement;
        final Diagnostics diagnostics;
        final int needed;
        final int perWeek;
        final int weeks;
        final int remainder;
        RequirementPlan plan;
        WeeklyCandidate[] cells;
        String failureReason;

        ResultPlan(SessionRequirement requirement, Diagnostics diagnostics) {
            this.requirement = requirement;
            this.diagnostics = diagnostics;
            this.needed = Math.max(0, requirement.sessionsNeeded());
            this.perWeek = resolvePerWeek(requirement);
            this.weeks = needed == 0 ? 0 : (needed + perWeek - 1) / perWeek;
            this.remainder = needed == 0 ? 0 : needed % perWeek;
        }

        int cellCount() {
            return plan == null ? 0 : plan.cellCount();
        }
    }

    private static final class BudgetExceeded extends RuntimeException {
        BudgetExceeded() {
            super(null, null, false, false);
        }
    }

    private final class Execution {
        private final SolverInput input;
        private final long deadlineNanos;
        private final SolverOptions options;
        private final Map<Integer, TimeSlot> slots = new TreeMap<>();
        private final List<TimeSlot> activeSlots = new ArrayList<>();
        private final List<ResultPlan> resultPlans = new ArrayList<>();
        private final OccupancyBoard board = new OccupancyBoard();
        private final List<SolverPlacement> placements = new ArrayList<>();
        private final List<SolverUnscheduled> unscheduled = new ArrayList<>();

        private long steps;
        private int exceptionCount;
        private boolean timedOut;

        Execution(SolverInput input, long deadlineNanos) {
            this.input = input;
            this.options = input.options();
            this.deadlineNanos = deadlineNanos;
            for (TimeSlot slot : input.slots()) {
                if (slot == null || !slot.active()) continue;
                slots.put(slot.periodNo(), slot);
                activeSlots.add(slot);
            }
            activeSlots.sort(Comparator.comparingInt(TimeSlot::periodNo));
        }

        void run() {
            for (ExistingSession session : input.existingSessions()) {
                if (session == null) continue;
                board.add(session.teacherId(), session.roomId(), session.classId(), null,
                    session.start(), session.end());
            }
            try {
                solveStages();
            } catch (BudgetExceeded ignored) {
                timedOut = true;
            }
            explodeAll();
        }

        // ---------------------------------------------------------------- giai đoạn 1

        private void solveStages() {
            Map<Integer, List<ResultPlan>> stages = new TreeMap<>();
            for (SessionRequirement requirement : orderedRequirements()) {
                ResultPlan resultPlan = new ResultPlan(requirement, new Diagnostics());
                stages.computeIfAbsent(stageNo(requirement), key -> new ArrayList<>()).add(resultPlan);
                resultPlans.add(resultPlan);
            }
            Map<String, Integer> teacherLoad = new TreeMap<>();
            Map<String, List<WeeklyCandidate>> earlierByClass = new TreeMap<>();

            for (List<ResultPlan> stagePlans : stages.values()) {
                checkBudget();
                for (ResultPlan resultPlan : stagePlans) {
                    checkBudget();
                    RequirementPlan plan = buildPlan(resultPlan.requirement, teacherLoad,
                        earlierByClass, resultPlan.diagnostics);
                    resultPlan.plan = plan;
                    if (plan.candidates().isEmpty()) {
                        resultPlan.failureReason = resultPlan.diagnostics.reason(resultPlan.requirement);
                    }
                }
                solveStage(stagePlans);
                rememberForNextStages(stagePlans, teacherLoad, earlierByClass);
            }
        }

        private List<SessionRequirement> orderedRequirements() {
            List<SessionRequirement> ordered = new ArrayList<>();
            for (SessionRequirement requirement : input.requirements()) {
                if (requirement != null) ordered.add(requirement);
            }
            ordered.sort(Comparator
                .comparingInt(AutoScheduleSolver::stageNo)
                .thenComparing(requirement -> safe(requirement.classId()))
                .thenComparing(requirement -> safe(requirement.subjectId()))
                .thenComparing(SessionRequirement::windowFrom, Comparator.nullsFirst(Comparator.naturalOrder()))
                .thenComparing(SessionRequirement::subjectName, Comparator.nullsFirst(Comparator.naturalOrder())));
            return ordered;
        }

        private void rememberForNextStages(List<ResultPlan> stagePlans,
                                           Map<String, Integer> teacherLoad,
                                           Map<String, List<WeeklyCandidate>> earlierByClass) {
            for (ResultPlan resultPlan : stagePlans) {
                if (resultPlan.cells == null) continue;
                String classId = resultPlan.requirement.classId();
                for (WeeklyCandidate cell : resultPlan.cells) {
                    if (cell == null) continue;
                    earlierByClass.computeIfAbsent(classId, key -> new ArrayList<>()).add(cell);
                    if (cell.teacherId() != null) teacherLoad.merge(cell.teacherId(), 1, Integer::sum);
                }
            }
        }

        private void solveStage(List<ResultPlan> stagePlans) {
            StageState state = new StageState(stagePlans);
            if (state.totalCells == 0) return;
            boolean solved;
            try {
                solved = state.search();
            } catch (BudgetExceeded exceeded) {
                state.restoreBest();
                throw exceeded;
            }
            if (!solved) state.restoreBest();
            for (int index = 0; index < stagePlans.size(); index++) {
                stagePlans.get(index).cells = state.assignment[index];
            }
        }

        private RequirementPlan buildPlan(SessionRequirement requirement,
                                          Map<String, Integer> teacherLoad,
                                          Map<String, List<WeeklyCandidate>> earlierByClass,
                                          Diagnostics diagnostics) {
            int needed = requirement.sessionsNeeded();
            int perWeek = resolvePerWeek(requirement);
            int cellCount = Math.min(perWeek, Math.max(0, needed));
            if (needed <= 0) return new RequirementPlan(List.of(), 0);

            List<String> teachers = teacherOptions(requirement);
            if (teachers.isEmpty()) {
                diagnostics.hit(Diagnostics.NO_TEACHER);
                return new RequirementPlan(List.of(), cellCount);
            }
            LocalDate windowFrom = requirement.windowFrom();
            LocalDate windowTo = requirement.windowTo();
            if (windowFrom == null || windowTo == null || windowTo.isBefore(windowFrom)) {
                diagnostics.hit(Diagnostics.NO_WEEKDAY);
                return new RequirementPlan(List.of(), cellCount);
            }

            boolean computer = isComputerRequirement(requirement);
            List<SolverRoom> typedRooms = roomsFor(requirement);
            if (typedRooms.isEmpty()) {
                diagnostics.hit(computer ? Diagnostics.NO_ROOM_TYPE : Diagnostics.CAPACITY);
                return new RequirementPlan(List.of(), cellCount);
            }
            List<SolverRoom> fitRooms = new ArrayList<>();
            for (SolverRoom room : typedRooms) {
                if (room.capacity() >= requirement.studentCount()) fitRooms.add(room);
            }
            if (fitRooms.isEmpty()) {
                diagnostics.hit(Diagnostics.CAPACITY);
                return new RequirementPlan(List.of(), cellCount);
            }

            List<WeeklyCandidate> earlier = earlierByClass.getOrDefault(requirement.classId(), List.of());
            List<WeeklyCandidate> candidates = new ArrayList<>();
            for (int weekday = 1; weekday <= 7; weekday++) {
                if (!options.isWeekdayAllowed(weekday)) continue;
                checkBudget();
                List<LocalDate> dates = datesForWeekday(windowFrom, windowTo, weekday);
                if (dates.isEmpty()) {
                    diagnostics.hit(Diagnostics.NO_WEEKDAY);
                    continue;
                }
                for (TimeSlot slot : activeSlots) {
                    List<Integer> periods = ScheduleRules.sessionPeriods(input.slots(),
                        slot.periodNo(), requirement.sessionMinutes());
                    if (periods.isEmpty()) {
                        diagnostics.hit(Diagnostics.NO_CHAIN);
                        continue;
                    }
                    if (!classAllowed(requirement.classId(), weekday, periods)) {
                        diagnostics.hit(Diagnostics.CLASS_RULE);
                        continue;
                    }
                    List<String> freeTeachers = new ArrayList<>();
                    for (String teacher : teachers) {
                        if (teacherFree(teacher, weekday, periods)) freeTeachers.add(teacher);
                    }
                    if (freeTeachers.isEmpty()) {
                        diagnostics.hit(Diagnostics.TEACHER_UNAVAILABLE);
                        continue;
                    }
                    for (String teacher : freeTeachers) {
                        for (SolverRoom room : fitRooms) {
                            Coverage coverage = coverage(requirement, teacher, room.id(), dates, periods);
                            if (coverage.ratio() < options.minCoverage()) {
                                diagnostics.hit(Diagnostics.COVERAGE);
                                continue;
                            }
                            boolean reuse = false;
                            int weekdayLoad = 0;
                            for (WeeklyCandidate previous : earlier) {
                                if (previous.weekday() == weekday) {
                                    weekdayLoad++;
                                    if (previous.startPeriod() == slot.periodNo()) reuse = true;
                                }
                            }
                            boolean anyOnComputerRoom = !computer && room.isComputerRoom();
                            double score = CandidateOrder.score(coverage.ratio(), reuse, anyOnComputerRoom,
                                room.capacity() - requirement.studentCount(),
                                teacherLoad.getOrDefault(teacher, 0), weekdayLoad);
                            candidates.add(new WeeklyCandidate(weekday, slot.periodNo(), periods, room.id(),
                                teacher, coverage.ratio(), coverage.total(), score));
                        }
                    }
                }
            }
            candidates.sort(CandidateOrder.byScore());
            return new RequirementPlan(candidates, cellCount);
        }

        private List<String> teacherOptions(SessionRequirement requirement) {
            if (requirement.teacherId() != null && !requirement.teacherId().isBlank()) {
                return List.of(requirement.teacherId());
            }
            Set<String> teachers = new LinkedHashSet<>();
            if (requirement.candidateTeachers() != null) {
                for (var candidate : requirement.candidateTeachers()) {
                    if (candidate != null && candidate.userId() != null && !candidate.userId().isBlank()) {
                        teachers.add(candidate.userId());
                    }
                }
            }
            return new ArrayList<>(teachers);
        }

        private List<SolverRoom> roomsFor(SessionRequirement requirement) {
            List<SolverRoom> result = new ArrayList<>();
            for (SolverRoom room : input.rooms()) {
                if (room == null) continue;
                if (isComputerRequirement(requirement) && !room.isComputerRoom()) continue;
                result.add(room);
            }
            result.sort(CandidateOrder.roomPreference());
            return result;
        }

        private Coverage coverage(SessionRequirement requirement, String teacherId, String roomId,
                                  List<LocalDate> dates, List<Integer> periods) {
            int passed = 0;
            for (LocalDate date : dates) {
                TimeRange range = range(date, periods);
                if (board.classConflict(requirement.classId(), range.start(), range.end()) != null) continue;
                if (teacherId != null && board.teacherConflict(teacherId, range.start(), range.end()) != null) continue;
                if (board.roomConflict(roomId, range.start(), range.end()) != null) continue;
                passed++;
            }
            return new Coverage(passed, dates.size());
        }

        private boolean classAllowed(String classId, int weekday, List<Integer> periods) {
            List<ClassSlotRule> rules = input.classSlotRules().getOrDefault(classId, List.of());
            for (Integer period : periods) {
                if (!ScheduleRules.isPeriodAllowedForClass(rules, weekday, period)) return false;
            }
            return true;
        }

        private boolean teacherFree(String teacherId, int weekday, List<Integer> periods) {
            List<TeacherAvailability> entries = input.teacherAvailability().getOrDefault(teacherId, List.of());
            for (Integer period : periods) {
                if (!ScheduleRules.isTeacherFree(entries, weekday, period)) return false;
            }
            return true;
        }

        private TimeRange range(LocalDate date, List<Integer> periods) {
            List<TimeSlot> periodSlots = new ArrayList<>(periods.size());
            for (Integer period : periods) {
                TimeSlot slot = slots.get(period);
                if (slot != null) periodSlots.add(slot);
            }
            return ScheduleRules.toInstantRange(date, periodSlots);
        }

        private void checkBudget() {
            if (System.nanoTime() > deadlineNanos || steps > options.maxSteps()) throw new BudgetExceeded();
        }

        // ---------------------------------------------------------------- tìm kiếm khung tuần

        private final class StageState {
            private final List<ResultPlan> plans;
            private final WeeklyCandidate[][] assignment;
            private final WeeklyCandidate[][] best;
            private final WeeklyTemplateBoard classBoard = new WeeklyTemplateBoard();
            private final WeeklyTemplateBoard teacherBoard = new WeeklyTemplateBoard();
            private final WeeklyTemplateBoard roomBoard = new WeeklyTemplateBoard();
            private final int totalCells;
            private int assigned;
            private int bestAssigned;

            StageState(List<ResultPlan> stagePlans) {
                this.plans = stagePlans;
                this.assignment = new WeeklyCandidate[stagePlans.size()][];
                this.best = new WeeklyCandidate[stagePlans.size()][];
                int cells = 0;
                for (int index = 0; index < stagePlans.size(); index++) {
                    int count = stagePlans.get(index).cellCount();
                    assignment[index] = new WeeklyCandidate[count];
                    best[index] = new WeeklyCandidate[count];
                    cells += count;
                }
                this.totalCells = cells;
            }

            boolean search() {
                if (assigned == totalCells) {
                    adoptIfBest();
                    return true;
                }
                checkBudget();
                int[] cell = chooseCell();
                if (cell == null) return assigned == totalCells;
                if (cell[2] == 0) return false;
                int planIndex = cell[0];
                int cellIndex = cell[1];
                for (WeeklyCandidate candidate : plans.get(planIndex).plan.candidates()) {
                    if (!viable(planIndex, candidate)) continue;
                    steps++;
                    checkBudget();
                    assign(planIndex, cellIndex, candidate);
                    if (assigned > bestAssigned) {
                        bestAssigned = assigned;
                        copyInto(assignment, best);
                    }
                    if (search()) return true;
                    unassign(planIndex, cellIndex, candidate);
                }
                return false;
            }

            void restoreBest() {
                copyInto(best, assignment);
                assigned = bestAssigned;
            }

            private int[] chooseCell() {
                int[] chosen = null;
                int chosenViable = Integer.MAX_VALUE;
                boolean chosenComputer = false;
                for (int planIndex = 0; planIndex < plans.size(); planIndex++) {
                    ResultPlan resultPlan = plans.get(planIndex);
                    RequirementPlan plan = resultPlan.plan;
                    if (plan == null || plan.cellCount() == 0) continue;
                    boolean computer = isComputerRequirement(resultPlan.requirement);
                    for (int cellIndex = 0; cellIndex < plan.cellCount(); cellIndex++) {
                        if (assignment[planIndex][cellIndex] != null) continue;
                        int viable = 0;
                        for (WeeklyCandidate candidate : plan.candidates()) {
                            if (viable(planIndex, candidate)) {
                                viable++;
                                if (viable > chosenViable) break;
                            }
                        }
                        if (viable == 0) return new int[]{planIndex, cellIndex, 0};
                        boolean better = viable < chosenViable
                            || (viable == chosenViable && chosen != null
                                && (computer && !chosenComputer
                                    || (computer == chosenComputer
                                        && (planIndex < chosen[0]
                                            || (planIndex == chosen[0] && cellIndex < chosen[1])))));
                        if (better) {
                            chosen = new int[]{planIndex, cellIndex, viable};
                            chosenViable = viable;
                            chosenComputer = computer;
                        }
                    }
                }
                return chosen;
            }

            private boolean viable(int planIndex, WeeklyCandidate candidate) {
                ResultPlan resultPlan = plans.get(planIndex);
                for (WeeklyCandidate assignedCell : assignment[planIndex]) {
                    if (assignedCell != null && assignedCell.weekday() == candidate.weekday()) return false;
                }
                if (classBoard.classConflict(resultPlan.requirement.classId(), candidate.weekday(), candidate.periods())) {
                    return false;
                }
                if (candidate.teacherId() != null
                    && teacherBoard.teacherConflict(candidate.teacherId(), candidate.weekday(), candidate.periods())) {
                    return false;
                }
                return !roomBoard.roomConflict(candidate.roomId(), candidate.weekday(), candidate.periods());
            }

            private void assign(int planIndex, int cellIndex, WeeklyCandidate candidate) {
                assignment[planIndex][cellIndex] = candidate;
                assigned++;
                ResultPlan resultPlan = plans.get(planIndex);
                classBoard.addClass(resultPlan.requirement.classId(), candidate.weekday(), candidate.periods());
                teacherBoard.addTeacher(candidate.teacherId(), candidate.weekday(), candidate.periods());
                roomBoard.addRoom(candidate.roomId(), candidate.weekday(), candidate.periods());
            }

            private void unassign(int planIndex, int cellIndex, WeeklyCandidate candidate) {
                assignment[planIndex][cellIndex] = null;
                assigned--;
                classBoard.removeLastClass(plans.get(planIndex).requirement.classId());
                teacherBoard.removeLastTeacher(candidate.teacherId());
                roomBoard.removeLastRoom(candidate.roomId());
            }

            private void adoptIfBest() {
                if (assigned > bestAssigned) {
                    bestAssigned = assigned;
                    copyInto(assignment, best);
                }
            }

            private void copyInto(WeeklyCandidate[][] source, WeeklyCandidate[][] target) {
                for (int index = 0; index < source.length; index++) {
                    System.arraycopy(source[index], 0, target[index], 0, source[index].length);
                }
            }
        }

        // ---------------------------------------------------------------- giai đoạn 2

        private void explodeAll() {
            for (ResultPlan resultPlan : resultPlans) {
                explodePlan(resultPlan);
            }
            placements.sort(Comparator
                .comparing(SolverPlacement::date)
                .thenComparingInt(placement -> placement.periods().isEmpty() ? 0 : placement.periods().get(0))
                .thenComparing(placement -> safe(placement.classId()))
                .thenComparing(placement -> safe(placement.subjectId()))
                .thenComparing(placement -> safe(placement.roomId())));
            unscheduled.sort(Comparator
                .comparing((SolverUnscheduled entry) -> safe(entry.classId()))
                .thenComparing(entry -> safe(entry.subjectId()))
                .thenComparing(entry -> entry.sessionNo() == null ? 0 : entry.sessionNo())
                .thenComparing(entry -> entry.date() == null ? LocalDate.MIN : entry.date()));
        }

        private void explodePlan(ResultPlan resultPlan) {
            SessionRequirement requirement = resultPlan.requirement;
            if (resultPlan.needed <= 0) return;
            if (resultPlan.failureReason != null) {
                unscheduled.add(new SolverUnscheduled(requirement.classId(), requirement.subjectId(),
                    null, null, resultPlan.failureReason));
                return;
            }
            if (resultPlan.cells == null || allNull(resultPlan.cells)) {
                unscheduled.add(new SolverUnscheduled(requirement.classId(), requirement.subjectId(),
                    null, null, unassignedReason(resultPlan) + " (" + resultPlan.needed + " buổi chưa xếp)"));
                return;
            }
            int sessionNo = 0;
            for (int week = 0; week < resultPlan.weeks; week++) {
                int sessionsThisWeek = sessionsInWeek(resultPlan, week);
                List<LocalDate> weekDates = weekDates(requirement, week);
                Set<LocalDate> usedDates = new HashSet<>();
                for (int cellIndex = 0; cellIndex < sessionsThisWeek; cellIndex++) {
                    sessionNo++;
                    WeeklyCandidate cell = cellIndex < resultPlan.cells.length
                        ? resultPlan.cells[cellIndex] : null;
                    if (cell == null) {
                        unscheduled.add(new SolverUnscheduled(requirement.classId(), requirement.subjectId(),
                            sessionNo, null, unassignedReason(resultPlan)));
                        continue;
                    }
                    LocalDate preferred = preferredDate(weekDates, cell.weekday());
                    Attempt attempt = placeWithRepairs(requirement, cell, preferred, weekDates, usedDates);
                    if (attempt == null) {
                        unscheduled.add(new SolverUnscheduled(requirement.classId(), requirement.subjectId(),
                            sessionNo, preferred,
                            "Tuần " + weekNo(requirement, preferred) + ": " + subjectLabel(requirement)
                                + " không còn ô thay thế ("
                                + blockerFor(requirement, preferred, cell.periods(), cell.roomId(),
                                    cell.teacherId(), usedDates) + ")"));
                        continue;
                    }
                    usedDates.add(attempt.date);
                    recordPlacement(requirement, attempt);
                }
            }
        }

        private int sessionsInWeek(ResultPlan resultPlan, int week) {
            int cells = resultPlan.cells == null ? 0 : resultPlan.cells.length;
            if (week == resultPlan.weeks - 1 && resultPlan.remainder > 0) {
                return Math.min(resultPlan.remainder, cells);
            }
            return Math.min(resultPlan.perWeek, cells);
        }

        private LocalDate preferredDate(List<LocalDate> weekDates, int weekday) {
            for (LocalDate date : weekDates) {
                if (date.getDayOfWeek().getValue() == weekday) return date;
            }
            return null;
        }

        private Attempt placeWithRepairs(SessionRequirement requirement, WeeklyCandidate cell,
                                         LocalDate preferred, List<LocalDate> weekDates,
                                         Set<LocalDate> usedDates) {
            if (weekDates.isEmpty()) return null;
            List<SolverRoom> fitRooms = fitRoomsFor(requirement);
            if (preferred != null) {
                Attempt attempt = tryCell(requirement, preferred, cell.periods(), cell.roomId(),
                    cell.teacherId(), usedDates);
                if (attempt != null) return attempt;

                String blocker = blockerFor(requirement, preferred, cell.periods(), cell.roomId(),
                    cell.teacherId(), usedDates);

                for (SolverRoom room : fitRooms) {
                    if (room.id().equals(cell.roomId())) continue;
                    attempt = tryCell(requirement, preferred, cell.periods(), room.id(),
                        cell.teacherId(), usedDates);
                    if (attempt != null) {
                        return attempt.withException(SolverPlacement.ROOM_CHANGED,
                            "Đổi phòng sang " + room.code() + " vì " + blocker);
                    }
                }

                for (int startPeriod : startPeriods(requirement)) {
                    if (startPeriod == cell.startPeriod()) continue;
                    List<Integer> periods = ScheduleRules.sessionPeriods(input.slots(), startPeriod,
                        requirement.sessionMinutes());
                    if (periods.isEmpty()) continue;
                    for (SolverRoom room : orderedRooms(fitRooms, cell.roomId())) {
                        attempt = tryCell(requirement, preferred, periods, room.id(),
                            cell.teacherId(), usedDates);
                        if (attempt != null) {
                            return attempt.withException(SolverPlacement.PERIOD_CHANGED,
                                "Đổi sang tiết " + periods.get(0) + "-" + last(periods)
                                    + " vì " + blocker);
                        }
                    }
                }
            }

            for (LocalDate date : weekDates) {
                if (date.equals(preferred)) continue;
                Attempt attempt = tryCell(requirement, date, cell.periods(), cell.roomId(),
                    cell.teacherId(), usedDates);
                if (attempt != null) {
                    return attempt.withException(SolverPlacement.DAY_CHANGED,
                        "Chuyển sang ngày " + date + " vì "
                            + (preferred == null ? "tuần không có thứ đã chọn"
                            : "ô mẫu ngày " + preferred + " bị vướng"));
                }
                for (int startPeriod : startPeriods(requirement)) {
                    if (startPeriod == cell.startPeriod()) continue;
                    List<Integer> periods = ScheduleRules.sessionPeriods(input.slots(), startPeriod,
                        requirement.sessionMinutes());
                    if (periods.isEmpty()) continue;
                    for (SolverRoom room : orderedRooms(fitRooms, cell.roomId())) {
                        attempt = tryCell(requirement, date, periods, room.id(),
                            cell.teacherId(), usedDates);
                        if (attempt != null) {
                            return attempt.withException(SolverPlacement.DAY_CHANGED,
                                "Chuyển sang ngày " + date + " và tiết " + periods.get(0)
                                    + "-" + last(periods) + " vì ô mẫu bị vướng");
                        }
                    }
                }
            }
            return null;
        }

        private Attempt tryCell(SessionRequirement requirement, LocalDate date, List<Integer> periods,
                                String roomId, String teacherId, Set<LocalDate> usedDates) {
            if (date == null || periods == null || periods.isEmpty() || roomId == null) return null;
            if (date.isBefore(requirement.windowFrom()) || date.isAfter(requirement.windowTo())) return null;
            if (usedDates.contains(date)) return null;
            int weekday = date.getDayOfWeek().getValue();
            if (!options.isWeekdayAllowed(weekday)) return null;
            TimeSlot first = slots.get(periods.get(0));
            if (first == null) return null;
            List<Integer> chain = ScheduleRules.sessionPeriods(input.slots(), first.periodNo(),
                requirement.sessionMinutes());
            if (!chain.equals(periods)) return null;
            if (!classAllowed(requirement.classId(), weekday, periods)) return null;
            if (teacherId != null && !teacherFree(teacherId, weekday, periods)) return null;
            SolverRoom room = roomById(roomId);
            if (room == null || !roomFits(requirement, room)) return null;
            TimeRange range = range(date, periods);
            if (board.classConflict(requirement.classId(), range.start(), range.end()) != null) return null;
            if (teacherId != null && board.teacherConflict(teacherId, range.start(), range.end()) != null) {
                return null;
            }
            if (board.roomConflict(roomId, range.start(), range.end()) != null) return null;
            Attempt attempt = new Attempt();
            attempt.date = date;
            attempt.periods = List.copyOf(periods);
            attempt.roomId = roomId;
            attempt.teacherId = teacherId;
            attempt.range = range;
            return attempt;
        }

        private String blockerFor(SessionRequirement requirement, LocalDate date, List<Integer> periods,
                                  String roomId, String teacherId, Set<LocalDate> usedDates) {
            if (date == null) return "tuần này không có thứ phù hợp trong cửa sổ ngày";
            if (usedDates.contains(date)) return "ngày đã có buổi khác của cùng môn";
            int weekday = date.getDayOfWeek().getValue();
            if (!options.isWeekdayAllowed(weekday)) return "thứ " + weekday + " không được phép xếp";
            if (!classAllowed(requirement.classId(), weekday, periods)) return "khung giờ của lớp không cho phép";
            if (teacherId != null && !teacherFree(teacherId, weekday, periods)) return "giáo viên không rảnh";
            SolverRoom room = roomById(roomId);
            if (room == null || !roomFits(requirement, room)) return "không có phòng phù hợp sức chứa/loại phòng";
            TimeRange range = range(date, periods);
            OccupancyBoard.Entry classEntry = board.classConflict(requirement.classId(), range.start(), range.end());
            if (classEntry != null) return "lớp đã có buổi môn " + safe(classEntry.subjectId());
            if (teacherId != null) {
                OccupancyBoard.Entry teacherEntry = board.teacherConflict(teacherId, range.start(), range.end());
                if (teacherEntry != null) return "giáo viên đã có buổi của lớp " + safe(teacherEntry.classId());
            }
            OccupancyBoard.Entry roomEntry = board.roomConflict(roomId, range.start(), range.end());
            if (roomEntry != null) return "phòng đã có buổi của lớp " + safe(roomEntry.classId());
            return "xung đột lịch";
        }

        private void recordPlacement(SessionRequirement requirement, Attempt attempt) {
            if (attempt.isException()) exceptionCount++;
            placements.add(new SolverPlacement(requirement.classId(), requirement.subjectId(),
                attempt.teacherId, attempt.roomId, attempt.date, attempt.periods,
                attempt.range.start(), attempt.range.end(), weekNo(requirement, attempt.date),
                attempt.isException(), attempt.exceptionType, attempt.exceptionReason));
            board.add(attempt.teacherId, attempt.roomId, requirement.classId(), requirement.subjectId(),
                attempt.range.start(), attempt.range.end());
        }

        private List<SolverRoom> fitRoomsFor(SessionRequirement requirement) {
            List<SolverRoom> fit = new ArrayList<>();
            for (SolverRoom room : roomsFor(requirement)) {
                if (room.capacity() >= requirement.studentCount()) fit.add(room);
            }
            return fit;
        }

        private List<SolverRoom> orderedRooms(List<SolverRoom> rooms, String primaryRoomId) {
            List<SolverRoom> ordered = new ArrayList<>(rooms);
            ordered.sort(Comparator
                .comparingInt((SolverRoom room) -> room.id().equals(primaryRoomId) ? 0 : 1)
                .thenComparingInt(SolverRoom::capacity)
                .thenComparing(SolverRoom::id));
            return ordered;
        }

        private List<Integer> startPeriods(SessionRequirement requirement) {
            List<Integer> starts = new ArrayList<>();
            for (TimeSlot slot : activeSlots) {
                if (!ScheduleRules.sessionPeriods(input.slots(), slot.periodNo(),
                    requirement.sessionMinutes()).isEmpty()) {
                    starts.add(slot.periodNo());
                }
            }
            return starts;
        }

        private SolverRoom roomById(String roomId) {
            for (SolverRoom room : input.rooms()) {
                if (room != null && room.id().equals(roomId)) return room;
            }
            return null;
        }

        private boolean roomFits(SessionRequirement requirement, SolverRoom room) {
            if (room.capacity() < requirement.studentCount()) return false;
            return !isComputerRequirement(requirement) || room.isComputerRoom();
        }

        private List<LocalDate> weekDates(SessionRequirement requirement, int week) {
            if (requirement.windowFrom() == null || requirement.windowTo() == null) return List.of();
            LocalDate monday = requirement.windowFrom().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            LocalDate start = monday.plusWeeks(week);
            List<LocalDate> dates = new ArrayList<>(7);
            for (int offset = 0; offset < 7; offset++) {
                LocalDate date = start.plusDays(offset);
                if (!date.isBefore(requirement.windowFrom()) && !date.isAfter(requirement.windowTo())) {
                    dates.add(date);
                }
            }
            return dates;
        }

        private int weekNo(SessionRequirement requirement, LocalDate date) {
            if (date == null || requirement.windowFrom() == null) return 0;
            LocalDate firstMonday = requirement.windowFrom()
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            LocalDate monday = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            return (int) ChronoUnit.WEEKS.between(firstMonday, monday) + 1;
        }

        private String unassignedReason(ResultPlan resultPlan) {
            if (timedOut) {
                return "Hết giới hạn tìm kiếm nên chưa xếp được buổi của môn "
                    + subjectLabel(resultPlan.requirement);
            }
            return "Không tìm được khung tuần không xung đột cho môn "
                + subjectLabel(resultPlan.requirement)
                + " (giai đoạn " + stageNo(resultPlan.requirement) + ")";
        }

        private boolean allNull(WeeklyCandidate[] cells) {
            for (WeeklyCandidate cell : cells) {
                if (cell != null) return false;
            }
            return true;
        }
    }

    private static List<LocalDate> datesForWeekday(LocalDate from, LocalDate to, int weekday) {
        List<LocalDate> dates = new ArrayList<>();
        LocalDate cursor = from.plusDays(Math.floorMod(weekday - from.getDayOfWeek().getValue(), 7));
        while (!cursor.isAfter(to)) {
            dates.add(cursor);
            cursor = cursor.plusWeeks(1);
        }
        return dates;
    }

    private static int last(List<Integer> periods) {
        return periods.get(periods.size() - 1);
    }

    private static String safe(String value) {
        return value == null ? "" : value;
    }
}
