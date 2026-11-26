package com.mems.exception;

import com.mems.dto.ClassMismatch;
import com.mems.dto.SubjectUsageResponse;

import java.util.List;

/**
 * Môn đang được lớp/chương trình sử dụng — client phải gửi lại với confirm=true
 * để áp dụng thay đổi category/roomRequirement.
 */
public class SubjectUsageWarningException extends RuntimeException {
    private final List<ClassMismatch> classes;
    private final List<SubjectUsageResponse.CurriculumUsageItem> curricula;

    public SubjectUsageWarningException(List<ClassMismatch> classes,
                                        List<SubjectUsageResponse.CurriculumUsageItem> curricula) {
        super("Subject is in use");
        this.classes = List.copyOf(classes);
        this.curricula = List.copyOf(curricula);
    }

    public List<ClassMismatch> getClasses() { return classes; }

    public List<SubjectUsageResponse.CurriculumUsageItem> getCurricula() { return curricula; }
}
