package com.mems.controller;

import com.mems.dto.ClassScheduleInfo;
import com.mems.dto.SchoolClassResponse;
import com.mems.dto.StudentClassResponse;
import com.mems.repository.SchoolClassRepository;
import com.mems.repository.StudentRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Tra cứu lớp cho ScheduleService: trạng thái lớp, giáo viên phụ trách và lớp của
 * một học sinh. Chỉ dùng nội bộ (X-Internal-Api-Key), luôn lọc theo orgId.
 */
@RestController
@RequestMapping("/internal")
public class InternalScheduleLookupController {
    private final SchoolClassRepository classes;
    private final StudentRepository students;

    public InternalScheduleLookupController(SchoolClassRepository classes, StudentRepository students) {
        this.classes = classes;
        this.students = students;
    }

    @GetMapping("/classes/{classId}")
    @Transactional(readOnly = true)
    public ClassScheduleInfo classInfo(@PathVariable String classId, @RequestParam String orgId) {
        SchoolClassResponse info = classes.require(classId, orgId, false);
        return new ClassScheduleInfo(info.id(), info.orgId(), info.classCode(), info.name(),
            info.status(), info.teacher() == null ? null : info.teacher().id(),
            info.teacher() == null ? null : info.teacher().fullName(),
            info.startDate(), info.endDate(), info.subjectName(), info.studentCount());
    }

    @GetMapping("/students/{studentId}/classes")
    @Transactional(readOnly = true)
    public List<StudentClassResponse> studentClasses(@PathVariable String studentId,
                                                     @RequestParam String orgId) {
        return students.classesOf(studentId, orgId);
    }
}
