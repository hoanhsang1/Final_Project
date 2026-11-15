package com.mems.service;

import com.mems.repository.SchoolClassRepository;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.TreeSet;

/**
 * Gắn nhãn "cần phân công lại" và báo cho người quản lý lớp (quy tắc 17).
 *
 * <p>Người quản lý lớp = người tạo lớp + trưởng phòng phụ trách đào tạo
 * (xem {@link ClassApprovalPolicy}).</p>
 */
@Component
public class ClassReassignmentNotifier implements TeacherOffboardingHook {
    private final SchoolClassRepository classes;
    private final ClassApprovalPolicy approvalPolicy;
    private final NotificationService notifications;

    public ClassReassignmentNotifier(SchoolClassRepository classes, ClassApprovalPolicy approvalPolicy,
                                     NotificationService notifications) {
        this.classes = classes;
        this.approvalPolicy = approvalPolicy;
        this.notifications = notifications;
    }

    @Override
    public void teacherNeedsReassignment(String orgId, String userId, long activeClassCount) {
        flagAndNotify(orgId, userId, "Giáo viên đã nghỉ việc");
    }

    public int flagAndNotify(String orgId, String teacherId, String reason) {
        int flagged = classes.markNeedsReassignment(orgId, teacherId, reason);
        if (flagged > 0) {
            notifications.notifyAll(orgId, managersForTeacher(orgId, teacherId),
                "CLASS_REASSIGNMENT_NEEDED", "Lớp cần phân công lại giáo viên",
                "Có " + flagged + " lớp cần phân công giáo viên khác. Lý do: " + reason,
                "TEACHER", teacherId);
        }
        return flagged;
    }

    public void notifyManagers(String orgId, String teacherId) {
        notifications.notifyAll(orgId, managersForTeacher(orgId, teacherId),
            "CLASS_REASSIGNMENT_NEEDED", "Lớp cần phân công lại giáo viên",
            "Giáo viên phụ trách vừa thay đổi phòng ban/nghỉ việc; vui lòng phân công lại.",
            "TEACHER", teacherId);
    }

    public Set<String> managersForTeacher(String orgId, String teacherId) {
        Set<String> result = new TreeSet<>(classes.classCreatorsForTeacher(orgId, teacherId));
        result.addAll(approvalPolicy.responsibleHeadIds(orgId));
        return result;
    }
}
