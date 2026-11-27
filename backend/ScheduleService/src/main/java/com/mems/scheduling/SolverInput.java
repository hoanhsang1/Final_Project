package com.mems.scheduling;

import com.mems.dto.SessionRequirement;
import com.mems.schedule.ClassSlotRule;
import com.mems.schedule.TeacherAvailability;
import com.mems.schedule.TimeSlot;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/** Toàn bộ dữ liệu đầu vào đã chuẩn bị cho bộ xếp lịch thuần (không DB/HTTP). */
public record SolverInput(
    List<SessionRequirement> requirements,
    List<TimeSlot> slots,
    List<SolverRoom> rooms,
    Map<String, List<TeacherAvailability>> teacherAvailability,
    Map<String, List<ClassSlotRule>> classSlotRules,
    List<ExistingSession> existingSessions,
    SolverOptions options
) {

    public SolverInput {
        requirements = requirements == null ? List.of() : List.copyOf(requirements);
        slots = slots == null ? List.of() : List.copyOf(slots);
        rooms = rooms == null ? List.of() : List.copyOf(rooms);
        teacherAvailability = immutableSorted(teacherAvailability);
        classSlotRules = immutableSorted(classSlotRules);
        existingSessions = existingSessions == null ? List.of() : List.copyOf(existingSessions);
        options = options == null ? SolverOptions.defaults() : options;
    }

    private static <T> Map<String, List<T>> immutableSorted(Map<String, List<T>> source) {
        if (source == null || source.isEmpty()) return Map.of();
        Map<String, List<T>> sorted = new TreeMap<>();
        source.forEach((key, value) -> {
            if (key != null) sorted.put(key, value == null ? List.of() : List.copyOf(value));
        });
        return Collections.unmodifiableMap(sorted);
    }
}
