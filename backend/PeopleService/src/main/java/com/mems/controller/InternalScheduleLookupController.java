package com.mems.controller;

import com.mems.dto.ClassScheduleInfo;
import com.mems.dto.ClassSubjectResponse;
import com.mems.dto.EligibleTeacherInfo;
import com.mems.dto.SchoolClassResponse;
import com.mems.dto.StudentClassResponse;
import com.mems.repository.ClassSubjectRepository;
import com.mems.repository.SchoolClassRepository;
import com.mems.repository.StudentRepository;
import com.mems.repository.TeacherRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Tra cứu lớp cho ScheduleService: trạng thái lớp, giáo viên phụ trách và lớp của
 * một học sinh. Chỉ dùng nội bộ (X-Internal-Api-Key), luôn lọc theo orgId.
 */
@RestController
@RequestMapping("/internal")
public class InternalScheduleLookupController {
    private final SchoolClassRepository classes;
    private final StudentRepository students;
    private final TeacherRepository teachers;
    private final ClassSubjectRepository classSubjects;

    public InternalScheduleLookupController(SchoolClassRepository classes, StudentRepository students,
                                            TeacherRepository teachers, ClassSubjectRepository classSubjects) {
        this.classes = classes;
        this.students = students;
        this.teachers = teachers;
        this.classSubjects = classSubjects;
    }

    @GetMapping("/classes/{classId}")
    @Transactional(readOnly = true)
    public ClassScheduleInfo classInfo(@PathVariable String classId, @RequestParam String orgId) {
        SchoolClassResponse info = classes.require(classId, orgId, false);
        return new ClassScheduleInfo(info.id(), info.orgId(), info.classCode(), info.name(),
            info.status(), info.closeState(), info.teacher() == null ? null : info.teacher().id(),
            info.teacher() == null ? null : info.teacher().fullName(),
            info.startDate(), info.endDate(), info.subjectId(), info.subjectName(), info.studentCount());
    }

    @GetMapping("/classes/{classId}/subjects")
    @Transactional(readOnly = true)
    public List<ClassSubjectResponse> classSubjects(@PathVariable String classId, @RequestParam String orgId) {
        return classSubjects.list(classId).subjects();
    }

    @GetMapping("/students/{studentId}/classes")
    @Transactional(readOnly = true)
    public List<StudentClassResponse> studentClasses(@PathVariable String studentId,
                                                     @RequestParam String orgId) {
        return students.classesOf(studentId, orgId);
    }

    /**
     * Danh sách giáo viên đủ điều kiện dạy subjectId trong org.
     * Dùng bởi ScheduleService để xếp lịch tự động.
     */
    @GetMapping("/teachers/eligible")
    @Transactional(readOnly = true)
    public List<EligibleTeacherInfo> eligibleTeachers(@RequestParam String orgId,
                                                      @RequestParam String subjectId) {
        return teachers.eligibleForSubject(orgId, subjectId);
    }

    /**
     * Batch: với mỗi subjectId trả danh sách giáo viên đủ điều kiện (có thể rỗng).
     * Dùng bởi ScheduleService khi dựng yêu cầu xếp lịch cho cả lớp.
     */
    @GetMapping("/subjects/eligible-teachers")
    @Transactional(readOnly = true)
    public Map<String, List<EligibleTeacherInfo>> eligibleTeachersBatch(
            @RequestParam String orgId, @RequestParam List<String> subjectIds) {
        return teachers.eligibleForSubjectBatch(orgId, subjectIds);
    }

    /** Xác nhận giáo viên thuộc org; 404 khi không tồn tại hoặc khác tổ chức. */
    @GetMapping("/teachers/{teacherId}")
    @Transactional(readOnly = true)
    public EligibleTeacherInfo teacher(@PathVariable String teacherId, @RequestParam String orgId) {
        var row = teachers.requireTeacher(teacherId, orgId, false);
        return new EligibleTeacherInfo(row.userId(), row.fullName(), row.departmentId());
    }
}
