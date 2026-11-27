package com.mems.dto;

import com.mems.client.EligibleTeacherInfo;

import java.time.LocalDate;
import java.util.List;

/**
 * Một môn của lớp cần xếp thêm buổi, kèm đủ dữ liệu để bộ xếp lịch quyết định.
 * `teacherId` có khi lớp đã gán giáo viên; ngược lại dùng `candidateTeachers`.
 */
public record SessionRequirement(
    String classId,
    String className,
    String subjectId,
    String subjectName,
    String teacherId,
    List<EligibleTeacherInfo> candidateTeachers,
    int sessionsNeeded,
    int sessionsPerWeek,
    int sessionMinutes,
    String roomRequirement,
    int studentCount,
    LocalDate windowFrom,
    LocalDate windowTo,
    int stageNo
) {}
