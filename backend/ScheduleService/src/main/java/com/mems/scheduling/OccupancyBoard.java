package com.mems.scheduling;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Sổ chiếm chỗ theo thời gian thực cho giáo viên, phòng và lớp. */
final class OccupancyBoard {

    record Entry(String classId, String subjectId, Instant start, Instant end) {}

    private final Map<String, List<Entry>> teachers = new HashMap<>();
    private final Map<String, List<Entry>> rooms = new HashMap<>();
    private final Map<String, List<Entry>> classes = new HashMap<>();

    void add(String teacherId, String roomId, String classId, String subjectId,
             Instant start, Instant end) {
        Entry entry = new Entry(classId, subjectId, start, end);
        if (teacherId != null) teachers.computeIfAbsent(teacherId, key -> new ArrayList<>()).add(entry);
        if (roomId != null) rooms.computeIfAbsent(roomId, key -> new ArrayList<>()).add(entry);
        if (classId != null) classes.computeIfAbsent(classId, key -> new ArrayList<>()).add(entry);
    }

    Entry teacherConflict(String teacherId, Instant start, Instant end) {
        return find(teachers.get(teacherId), start, end);
    }

    Entry roomConflict(String roomId, Instant start, Instant end) {
        return find(rooms.get(roomId), start, end);
    }

    Entry classConflict(String classId, Instant start, Instant end) {
        return find(classes.get(classId), start, end);
    }

    private Entry find(List<Entry> entries, Instant start, Instant end) {
        if (entries == null) return null;
        for (Entry entry : entries) {
            if (start.isBefore(entry.end()) && entry.start().isBefore(end)) return entry;
        }
        return null;
    }
}
