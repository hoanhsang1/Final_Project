package com.mems.scheduling;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Xung đột theo khung tuần trong cùng một giai đoạn (chưa gắn ngày cụ thể). */
final class WeeklyTemplateBoard {

    private record Slot(int weekday, int fromPeriod, int toPeriod) {}

    private final Map<String, List<Slot>> teachers = new HashMap<>();
    private final Map<String, List<Slot>> rooms = new HashMap<>();
    private final Map<String, List<Slot>> classes = new HashMap<>();

    boolean teacherConflict(String teacherId, int weekday, List<Integer> periods) {
        return find(teachers.get(teacherId), weekday, periods);
    }

    boolean roomConflict(String roomId, int weekday, List<Integer> periods) {
        return find(rooms.get(roomId), weekday, periods);
    }

    boolean classConflict(String classId, int weekday, List<Integer> periods) {
        return find(classes.get(classId), weekday, periods);
    }

    void addTeacher(String teacherId, int weekday, List<Integer> periods) {
        if (teacherId != null) add(teachers, teacherId, weekday, periods);
    }

    void addRoom(String roomId, int weekday, List<Integer> periods) {
        if (roomId != null) add(rooms, roomId, weekday, periods);
    }

    void addClass(String classId, int weekday, List<Integer> periods) {
        if (classId != null) add(classes, classId, weekday, periods);
    }

    void removeLastTeacher(String teacherId) {
        removeLast(teachers.get(teacherId));
    }

    void removeLastRoom(String roomId) {
        removeLast(rooms.get(roomId));
    }

    void removeLastClass(String classId) {
        removeLast(classes.get(classId));
    }

    private static void add(Map<String, List<Slot>> map, String id, int weekday, List<Integer> periods) {
        map.computeIfAbsent(id, key -> new ArrayList<>())
            .add(new Slot(weekday, periods.get(0), periods.get(periods.size() - 1)));
    }

    private static void removeLast(List<Slot> slots) {
        if (slots != null && !slots.isEmpty()) slots.remove(slots.size() - 1);
    }

    private static boolean find(List<Slot> slots, int weekday, List<Integer> periods) {
        if (slots == null || periods.isEmpty()) return false;
        int from = periods.get(0);
        int to = periods.get(periods.size() - 1);
        for (Slot slot : slots) {
            if (slot.weekday() != weekday) continue;
            if (slot.fromPeriod() <= to && from <= slot.toPeriod()) return true;
        }
        return false;
    }
}
