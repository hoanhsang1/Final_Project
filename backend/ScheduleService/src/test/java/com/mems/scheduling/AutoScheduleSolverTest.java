package com.mems.scheduling;

import com.mems.client.EligibleTeacherInfo;
import com.mems.dto.SessionRequirement;
import com.mems.schedule.ClassSlotRule;
import com.mems.schedule.TimeSlot;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class AutoScheduleSolverTest {

    private final AutoScheduleSolver solver = new AutoScheduleSolver();
    private final List<TimeSlot> slots = SolverFixtures.slots();

    // S1: một lớp, một môn, 2 buổi/tuần → hai buổi khác ngày.
    @Test
    void s1_oneClassOneSubjectTwiceAWeekUsesDifferentDays() {
        SessionRequirement requirement = SolverFixtures.requirement("C1", "S1", "T1", 2, 2, 30, "ANY",
            SolverFixtures.monday(0), SolverFixtures.endOfWeek(0), 1);
        SolverInput input = SolverFixtures.input(List.of(requirement),
            List.of(SolverFixtures.normal("R1", 40)), slots);

        SolverResult result = solver.solve(input);

        assertThat(result.stats().complete()).isTrue();
        assertThat(result.unscheduled()).isEmpty();
        assertThat(result.placements()).hasSize(2);
        assertThat(result.placements())
            .extracting(placement -> placement.date().getDayOfWeek().getValue())
            .doesNotHaveDuplicates();
        ScheduleConflictChecker.verify(input, result);
    }

    // S2: ba môn song song, ba giáo viên khác nhau → không trùng ô.
    @Test
    void s2_threeSubjectsParallelUseDistinctSlots() {
        List<SessionRequirement> requirements = List.of(
            SolverFixtures.requirement("C1", "S1", "T1", 2, 2, 30, "ANY",
                SolverFixtures.monday(0), SolverFixtures.endOfWeek(0), 1),
            SolverFixtures.requirement("C1", "S2", "T2", 2, 2, 30, "ANY",
                SolverFixtures.monday(0), SolverFixtures.endOfWeek(0), 1),
            SolverFixtures.requirement("C1", "S3", "T3", 2, 2, 30, "ANY",
                SolverFixtures.monday(0), SolverFixtures.endOfWeek(0), 1));
        SolverInput input = SolverFixtures.input(requirements,
            List.of(SolverFixtures.normal("R1", 40), SolverFixtures.normal("R2", 40)), slots);

        SolverResult result = solver.solve(input);

        assertThat(result.stats().complete()).isTrue();
        assertThat(result.placements()).hasSize(6);
        var usedSlots = result.placements().stream()
            .map(placement -> placement.date().getDayOfWeek().getValue() + "@" + placement.periods().get(0))
            .collect(Collectors.toSet());
        assertThat(usedSlots).hasSize(6);
        ScheduleConflictChecker.verify(input, result);
    }

    // S3: hai môn cùng một giáo viên → không trùng giờ.
    @Test
    void s3_twoSubjectsSameTeacherUseDistinctSlots() {
        List<SessionRequirement> requirements = List.of(
            SolverFixtures.requirement("C1", "S1", "T1", 2, 2, 30, "ANY",
                SolverFixtures.monday(0), SolverFixtures.endOfWeek(0), 1),
            SolverFixtures.requirement("C1", "S2", "T1", 2, 2, 30, "ANY",
                SolverFixtures.monday(0), SolverFixtures.endOfWeek(0), 1));
        SolverInput input = SolverFixtures.input(requirements, List.of(SolverFixtures.normal("R1", 40)), slots);

        SolverResult result = solver.solve(input);

        assertThat(result.stats().complete()).isTrue();
        assertThat(result.placements()).hasSize(4);
        assertThat(result.placements()).extracting(SolverPlacement::teacherId).containsOnly("T1");
        ScheduleConflictChecker.verify(input, result);
    }

    // S4: khung tiết của lớp chỉ cho thứ 2 tiết 6–10 và thứ 3 tiết 1–5.
    @Test
    void s4_respectsClassSlotRules() {
        List<ClassSlotRule> rules = new ArrayList<>();
        for (int weekday : List.of(1, 4, 5, 6, 7)) {
            rules.add(new ClassSlotRule(weekday, 1, 10, true));
        }
        rules.add(new ClassSlotRule(2, 6, 10, false));
        rules.add(new ClassSlotRule(3, 1, 5, false));
        SessionRequirement requirement = SolverFixtures.requirement("C1", "S1", "T1", 2, 2, 30, "ANY",
            SolverFixtures.monday(0), SolverFixtures.endOfWeek(0), 1);
        SolverInput input = SolverFixtures.input(List.of(requirement),
            List.of(SolverFixtures.normal("R1", 40)), slots, Map.of("C1", rules), Map.of(), List.of(),
            SolverOptions.defaults());

        SolverResult result = solver.solve(input);

        assertThat(result.stats().complete()).isTrue();
        assertThat(result.placements()).hasSize(2);
        for (SolverPlacement placement : result.placements()) {
            int weekday = placement.date().getDayOfWeek().getValue();
            assertThat(weekday).isIn(2, 3);
            if (weekday == 2) {
                assertThat(placement.periods()).allMatch(period -> period >= 6 && period <= 10);
            } else {
                assertThat(placement.periods()).allMatch(period -> period >= 1 && period <= 5);
            }
        }
        ScheduleConflictChecker.verify(input, result);
    }

    // S5: môn cần phòng máy nhưng không có phòng máy nào.
    @Test
    void s5_computerSubjectWithoutComputerRoomIsUnscheduled() {
        SessionRequirement requirement = SolverFixtures.requirement("C1", "S1", "T1", 2, 2, 30, "COMPUTER",
            SolverFixtures.monday(0), SolverFixtures.endOfWeek(0), 1);
        SolverInput input = SolverFixtures.input(List.of(requirement),
            List.of(SolverFixtures.normal("R1", 40)), slots);

        SolverResult result = solver.solve(input);

        assertThat(result.placements()).isEmpty();
        assertThat(result.unscheduled()).hasSize(1);
        assertThat(result.unscheduled().get(0).reason()).contains("phòng máy").contains("30");
        assertThat(result.stats().complete()).isFalse();
        ScheduleConflictChecker.verify(input, result);
    }

    // S6: lớp 55 học sinh nhưng phòng lớn nhất chỉ 50 chỗ.
    @Test
    void s6_classTooLargeForAnyRoomIsUnscheduled() {
        SessionRequirement requirement = SolverFixtures.requirement("C1", "S1", "T1", 2, 2, 55, "ANY",
            SolverFixtures.monday(0), SolverFixtures.endOfWeek(0), 1);
        SolverInput input = SolverFixtures.input(List.of(requirement),
            List.of(SolverFixtures.normal("R1", 50)), slots);

        SolverResult result = solver.solve(input);

        assertThat(result.placements()).isEmpty();
        assertThat(result.unscheduled()).hasSize(1);
        assertThat(result.unscheduled().get(0).reason()).contains("55").contains("chỗ");
        assertThat(result.stats().complete()).isFalse();
        ScheduleConflictChecker.verify(input, result);
    }

    // S7: giáo viên đã bận ở lớp khác cùng khung giờ → tránh khung đó.
    @Test
    void s7_avoidsTeacherBusyInOtherClass() {
        List<ExistingSession> existing = List.of(
            SolverFixtures.existing("CX", "T1", "R9", SolverFixtures.monday(0).plusDays(1), 3, slots));
        SessionRequirement requirement = SolverFixtures.requirement("C1", "S1", "T1", 2, 2, 30, "ANY",
            SolverFixtures.monday(0), SolverFixtures.endOfWeek(0), 1);
        SolverInput input = SolverFixtures.input(List.of(requirement),
            List.of(SolverFixtures.normal("R1", 40)), slots, Map.of(), Map.of(), existing,
            SolverOptions.defaults());

        SolverResult result = solver.solve(input);

        assertThat(result.stats().complete()).isTrue();
        assertThat(result.placements()).hasSize(2);
        assertThat(result.placements())
            .noneMatch(placement -> placement.date().getDayOfWeek().getValue() == 2
                && placement.periods().contains(3));
        ScheduleConflictChecker.verify(input, result);
    }

    // S8: buổi dài 135 phút không được vắt qua giờ nghỉ; chỉ dùng chuỗi tiết liền mạch.
    @Test
    void s8_longSessionDoesNotCrossBreak() {
        List<TimeSlot> custom = List.of(
            SolverFixtures.slot(1, "07:00", "07:45", true),
            SolverFixtures.slot(2, "07:45", "08:30", true),
            SolverFixtures.slot(3, "08:40", "09:25", true),
            SolverFixtures.slot(4, "09:25", "10:10", true),
            SolverFixtures.slot(5, "10:10", "10:55", true),
            SolverFixtures.slot(6, "10:55", "11:40", false));
        SessionRequirement requirement = new SessionRequirement("C1", "C1", "S1", "S1", "T1",
            List.of(new EligibleTeacherInfo("T1", "T1", "DP")), 1, 1, 135, "ANY", 30,
            SolverFixtures.monday(0), SolverFixtures.endOfWeek(0), 1);
        SolverInput input = SolverFixtures.input(List.of(requirement),
            List.of(SolverFixtures.normal("R1", 40)), custom);

        SolverResult result = solver.solve(input);

        assertThat(result.stats().complete()).isTrue();
        assertThat(result.placements()).hasSize(1);
        assertThat(result.placements().get(0).periods()).containsExactly(4, 5, 6);
        ScheduleConflictChecker.verify(input, result);
    }

    // S9: hai lớp tranh một phòng máy duy nhất → tách giờ, không trùng phòng.
    @Test
    void s9_twoClassesShareSingleComputerRoomWithoutClash() {
        List<SessionRequirement> requirements = List.of(
            SolverFixtures.requirement("C1", "S1", "T1", 2, 2, 30, "COMPUTER",
                SolverFixtures.monday(0), SolverFixtures.endOfWeek(0), 1),
            SolverFixtures.requirement("C2", "S2", "T2", 2, 2, 30, "COMPUTER",
                SolverFixtures.monday(0), SolverFixtures.endOfWeek(0), 1));
        SolverInput input = SolverFixtures.input(requirements,
            List.of(SolverFixtures.computer("RC", 40)), slots);

        SolverResult result = solver.solve(input);

        assertThat(result.stats().complete()).isTrue();
        assertThat(result.placements()).hasSize(4);
        assertThat(result.placements()).extracting(SolverPlacement::roomId).containsOnly("RC");
        ScheduleConflictChecker.verify(input, result);
    }

    // S10: 50 lớp vẫn kết thúc trong giới hạn thời gian.
    @Test
    void s10_fiftyClassesFinishWithinBudget() {
        List<SolverRoom> rooms = new ArrayList<>();
        for (int index = 1; index <= 10; index++) {
            rooms.add(SolverFixtures.normal(String.format("R%02d", index), 40));
        }
        List<SessionRequirement> requirements = new ArrayList<>();
        for (int index = 1; index <= 50; index++) {
            requirements.add(SolverFixtures.requirement(
                String.format("C%02d", index), String.format("S%02d", index),
                String.format("T%02d", index), 2, 2, 30, "ANY",
                SolverFixtures.monday(0), SolverFixtures.endOfWeek(3), 1));
        }
        SolverOptions options = new SolverOptions(5_000, 200_000, 0.5, Set.of(1, 2, 3, 4, 5));
        SolverInput input = SolverFixtures.input(requirements, rooms, slots, Map.of(), Map.of(),
            List.of(), options);

        SolverResult result = solver.solve(input);

        assertThat(result.stats().complete()).isTrue();
        assertThat(result.placements()).hasSize(100);
        ScheduleConflictChecker.verify(input, result);
    }

    // S11: môn ANY ưu tiên phòng thường; khi phòng thường kín mới dùng phòng máy.
    @Test
    void s11_anyPrefersNormalRoomButUsesComputerRoomWhenNormalIsFull() {
        SessionRequirement requirement = SolverFixtures.requirement("C1", "S1", "T1", 1, 1, 30, "ANY",
            SolverFixtures.monday(0), SolverFixtures.monday(0), 1);
        List<SolverRoom> rooms = List.of(
            SolverFixtures.normal("R1", 40), SolverFixtures.computer("R2", 40));

        SolverResult free = solver.solve(SolverFixtures.input(List.of(requirement), rooms, slots));
        assertThat(free.stats().complete()).isTrue();
        assertThat(free.placements()).hasSize(1);
        assertThat(free.placements().get(0).roomId()).isEqualTo("R1");
        ScheduleConflictChecker.verify(SolverFixtures.input(List.of(requirement), rooms, slots), free);

        List<ExistingSession> busy = new ArrayList<>();
        for (int startPeriod : List.of(1, 3, 5, 7, 9)) {
            busy.add(SolverFixtures.existing("CX", "TX", "R1", SolverFixtures.monday(0), startPeriod, slots));
        }
        SolverInput full = SolverFixtures.input(List.of(requirement), rooms, slots, Map.of(), Map.of(),
            busy, SolverOptions.defaults());
        SolverResult result = solver.solve(full);
        assertThat(result.stats().complete()).isTrue();
        assertThat(result.placements()).hasSize(1);
        assertThat(result.placements().get(0).roomId()).isEqualTo("R2");
        ScheduleConflictChecker.verify(full, result);
    }

    // S12: buổi lẻ ở tuần 3 chiếm ô mẫu → chỉ tuần đó phải sửa, ưu tiên đổi phòng.
    @Test
    void s12_oddWeekConflictOnlyChangesThatWeekAndPrefersRoomChange() {
        SessionRequirement main = SolverFixtures.requirement("C1", "S1", "T1", 5, 2, 30, "ANY",
            SolverFixtures.monday(0), SolverFixtures.endOfWeek(2), 1);
        SessionRequirement odd = SolverFixtures.requirement("C0", "S9", "T2", 1, 1, 30, "ANY",
            SolverFixtures.monday(2), SolverFixtures.monday(2), 2);
        SolverInput input = SolverFixtures.input(List.of(main, odd),
            List.of(SolverFixtures.normal("R1", 40), SolverFixtures.normal("R2", 40)), slots);

        SolverResult result = solver.solve(input);

        assertThat(result.stats().complete()).isTrue();
        assertThat(result.placements()).hasSize(6);
        List<SolverPlacement> exceptions = result.placements().stream()
            .filter(SolverPlacement::isException).toList();
        assertThat(exceptions).hasSize(1);
        SolverPlacement exception = exceptions.get(0);
        assertThat(exception.exceptionType()).isEqualTo(SolverPlacement.ROOM_CHANGED);
        assertThat(exception.classId()).isEqualTo("C0");
        assertThat(exception.date()).isEqualTo(SolverFixtures.monday(2));
        assertThat(exception.roomId()).isEqualTo("R2");
        assertThat(exception.exceptionReason()).contains("R2");
        ScheduleConflictChecker.verify(input, result);
    }

    // S13: lớp hai giai đoạn → giai đoạn 2 dùng lại khung giờ giai đoạn 1.
    @Test
    void s13_secondStageReusesFirstStageSlots() {
        List<SessionRequirement> requirements = List.of(
            SolverFixtures.requirement("C1", "S1", "T1", 2, 2, 30, "ANY",
                SolverFixtures.monday(0), SolverFixtures.endOfWeek(0), 1),
            SolverFixtures.requirement("C1", "S2", "T2", 2, 2, 30, "ANY",
                SolverFixtures.monday(1), SolverFixtures.endOfWeek(1), 2));
        SolverInput input = SolverFixtures.input(requirements,
            List.of(SolverFixtures.normal("R1", 40)), slots);

        SolverResult result = solver.solve(input);

        assertThat(result.stats().complete()).isTrue();
        Set<String> stageOneSlots = result.placements().stream()
            .filter(placement -> placement.subjectId().equals("S1"))
            .map(placement -> placement.date().getDayOfWeek().getValue() + "@" + placement.periods().get(0))
            .collect(Collectors.toSet());
        List<SolverPlacement> stageTwo = result.placements().stream()
            .filter(placement -> placement.subjectId().equals("S2")).toList();
        assertThat(stageTwo).hasSize(2);
        for (SolverPlacement placement : stageTwo) {
            assertThat(stageOneSlots).contains(
                placement.date().getDayOfWeek().getValue() + "@" + placement.periods().get(0));
        }
        ScheduleConflictChecker.verify(input, result);
    }

    // S15: buổi 150 phút → trần 240 phút/lớp/ngày chỉ cho 1 buổi mỗi ngày dù trần 2 buổi.
    @Test
    void s15_minuteCapKeepsLongSessionsToOnePerClassPerDay() {
        List<TimeSlot> custom = List.of(
            SolverFixtures.slot(1, "07:00", "07:50", true),
            SolverFixtures.slot(2, "07:50", "08:40", true),
            SolverFixtures.slot(3, "08:40", "09:30", false),
            SolverFixtures.slot(4, "09:40", "10:30", true),
            SolverFixtures.slot(5, "10:30", "11:20", true),
            SolverFixtures.slot(6, "11:20", "12:10", false));
        List<SessionRequirement> requirements = List.of(
            new SessionRequirement("C1", "C1", "S1", "S1", "T1",
                List.of(new EligibleTeacherInfo("T1", "T1", "DP")), 2, 2, 150, "ANY", 30,
                SolverFixtures.monday(0), SolverFixtures.endOfWeek(0), 1),
            new SessionRequirement("C1", "C1", "S2", "S2", "T2",
                List.of(new EligibleTeacherInfo("T2", "T2", "DP")), 2, 2, 150, "ANY", 30,
                SolverFixtures.monday(0), SolverFixtures.endOfWeek(0), 1));
        SolverInput input = SolverFixtures.input(requirements,
            List.of(SolverFixtures.normal("R1", 40), SolverFixtures.normal("R2", 40)), custom);

        SolverResult result = solver.solve(input);

        assertThat(result.stats().complete()).isTrue();
        assertThat(result.placements()).hasSize(4);
        var classDays = result.placements().stream()
            .map(placement -> placement.date())
            .collect(Collectors.toSet());
        assertThat(classDays).hasSize(4);
        ScheduleConflictChecker.verify(input, result);
    }

    // S14: môn cần phòng máy được ưu tiên hơn môn ANY khi chỉ còn một phòng máy.
    @Test
    void s14_computerSubjectWinsSingleComputerRoom() {
        List<SessionRequirement> requirements = List.of(
            SolverFixtures.requirement("C0", "S9", "T2", 1, 1, 30, "ANY",
                SolverFixtures.monday(0), SolverFixtures.monday(0), 1),
            SolverFixtures.requirement("C1", "S1", "T1", 1, 1, 30, "COMPUTER",
                SolverFixtures.monday(0), SolverFixtures.monday(0), 1));
        Map<String, List<ClassSlotRule>> rules = Map.of(
            "C0", List.of(new ClassSlotRule(1, 1, 2, false)),
            "C1", List.of(new ClassSlotRule(1, 1, 2, false)));
        SolverInput input = SolverFixtures.input(requirements,
            List.of(SolverFixtures.computer("RC", 40), SolverFixtures.normal("RN", 20)), slots,
            rules, Map.of(), List.of(), SolverOptions.defaults());

        SolverResult result = solver.solve(input);

        assertThat(result.stats().complete()).isFalse();
        assertThat(result.placements()).hasSize(1);
        assertThat(result.placements().get(0).classId()).isEqualTo("C1");
        assertThat(result.placements().get(0).roomId()).isEqualTo("RC");
        assertThat(result.unscheduled()).isNotEmpty();
        assertThat(result.unscheduled()).anyMatch(entry -> entry.classId().equals("C0"));
        ScheduleConflictChecker.verify(input, result);
    }

    // Hai lần chạy cùng dữ liệu → cùng kết quả (thứ tự và nội dung).
    @Test
    void sameInputProducesSameResult() {
        List<SessionRequirement> requirements = List.of(
            SolverFixtures.requirement("C1", "S1", "T1", 2, 2, 30, "ANY",
                SolverFixtures.monday(0), SolverFixtures.endOfWeek(0), 1),
            SolverFixtures.requirement("C1", "S2", "T2", 2, 2, 30, "ANY",
                SolverFixtures.monday(0), SolverFixtures.endOfWeek(0), 1));
        SolverInput input = SolverFixtures.input(requirements,
            List.of(SolverFixtures.normal("R1", 40), SolverFixtures.normal("R2", 40)), slots);

        SolverResult first = solver.solve(input);
        SolverResult second = solver.solve(input);

        assertThat(second.placements()).containsExactlyElementsOf(first.placements());
        assertThat(second.unscheduled()).containsExactlyElementsOf(first.unscheduled());
        assertThat(second.stats().steps()).isEqualTo(first.stats().steps());
        ScheduleConflictChecker.verify(input, first);
        ScheduleConflictChecker.verify(input, second);
    }

    // Hết ngân sách thời gian → trả kết quả một phần, complete=false, không treo.
    @Test
    void timeoutReturnsPartialResultWithoutHanging() {
        List<SolverRoom> rooms = new ArrayList<>();
        for (int index = 1; index <= 10; index++) {
            rooms.add(SolverFixtures.normal(String.format("R%02d", index), 40));
        }
        List<SessionRequirement> requirements = new ArrayList<>();
        for (int index = 1; index <= 50; index++) {
            requirements.add(SolverFixtures.requirement(
                String.format("C%02d", index), String.format("S%02d", index),
                String.format("T%02d", index), 2, 2, 30, "ANY",
                SolverFixtures.monday(0), SolverFixtures.endOfWeek(3), 1));
        }
        SolverOptions options = new SolverOptions(1, 200_000, 0.5, Set.of(1, 2, 3, 4, 5));
        SolverInput input = SolverFixtures.input(requirements, rooms, slots, Map.of(), Map.of(),
            List.of(), options);

        SolverResult result = solver.solve(input);

        assertThat(result.stats().complete()).isFalse();
        assertThat(result.stats().elapsedMillis()).isLessThan(5_000);
        assertThat(result.unscheduled()).isNotEmpty();
        assertThat(result.unscheduled()).allMatch(entry -> entry.reason() != null && !entry.reason().isBlank());
        ScheduleConflictChecker.verify(input, result);
    }

    // Facility không phản hồi: "phòng ảo" của môn này không được dùng cho môn khác.
    @Test
    void syntheticRoomOnlyServesItsOwnSubject() {
        SessionRequirement requirement = SolverFixtures.requirement("C1", "S2", "T2", 2, 2, 30, "ANY",
            SolverFixtures.monday(0), SolverFixtures.endOfWeek(0), 1);
        SolverInput input = SolverFixtures.input(List.of(requirement),
            List.of(new SolverRoom(SolverRoom.noRoomId("C1", "S1"), null, Integer.MAX_VALUE, null)),
            slots);

        SolverResult result = solver.solve(input);

        assertThat(result.placements()).isEmpty();
        assertThat(result.unscheduled()).isNotEmpty()
            .allMatch(entry -> entry.subjectId().equals("S2"));
    }

    // Facility không phản hồi: mỗi cặp lớp–môn có "phòng ảo" riêng, xếp đủ mà không trùng phòng.
    @Test
    void eachSubjectGetsItsOwnSyntheticRoom() {
        List<SessionRequirement> requirements = List.of(
            SolverFixtures.requirement("C1", "S1", "T1", 2, 2, 30, "ANY",
                SolverFixtures.monday(0), SolverFixtures.endOfWeek(0), 1),
            SolverFixtures.requirement("C1", "S2", "T2", 2, 2, 30, "ANY",
                SolverFixtures.monday(0), SolverFixtures.endOfWeek(0), 1));
        SolverInput input = SolverFixtures.input(requirements, List.of(
            new SolverRoom(SolverRoom.noRoomId("C1", "S1"), null, Integer.MAX_VALUE, null),
            new SolverRoom(SolverRoom.noRoomId("C1", "S2"), null, Integer.MAX_VALUE, null)), slots);

        SolverResult result = solver.solve(input);

        assertThat(result.stats().complete()).isTrue();
        assertThat(result.placements()).hasSize(4);
        assertThat(result.placements()).allSatisfy(placement ->
            assertThat(placement.roomId()).isEqualTo(
                SolverRoom.noRoomId(placement.classId(), placement.subjectId())));
    }

    // Facility không phản hồi: môn cần phòng máy vẫn xếp được giờ với "phòng ảo".
    @Test
    void syntheticRoomMakesComputerSubjectSchedulable() {
        SessionRequirement requirement = SolverFixtures.requirement("C1", "S1", "T1", 2, 2, 30, "COMPUTER",
            SolverFixtures.monday(0), SolverFixtures.endOfWeek(0), 1);
        String noRoom = SolverRoom.noRoomId("C1", "S1");
        SolverInput input = SolverFixtures.input(List.of(requirement),
            List.of(new SolverRoom(noRoom, null, Integer.MAX_VALUE, null)), slots);

        SolverResult result = solver.solve(input);

        assertThat(result.stats().complete()).isTrue();
        assertThat(result.unscheduled()).isEmpty();
        assertThat(result.placements()).hasSize(2)
            .allSatisfy(placement -> assertThat(placement.roomId()).isEqualTo(noRoom));
    }
}
