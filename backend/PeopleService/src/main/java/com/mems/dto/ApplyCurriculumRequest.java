package com.mems.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Áp chương trình đào tạo cho lớp. confirmReplace/keepManualSubjects được giữ để tương
 * thích hợp đồng FE; nghiệp vụ hiện tại luôn giữ môn MANUAL và chỉ thêm môn còn thiếu.
 */
public record ApplyCurriculumRequest(
    @NotBlank String curriculumId,
    @NotNull @Min(0) Integer version,
    Boolean confirmReplace,
    Boolean keepManualSubjects
) {}
