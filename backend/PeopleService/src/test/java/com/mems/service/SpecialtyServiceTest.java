package com.mems.service;

import com.mems.dto.SpecialtyCreateRequest;
import com.mems.dto.SpecialtyResponse;
import com.mems.dto.SpecialtyUpdateRequest;
import com.mems.exception.AppException;
import com.mems.repository.SpecialtyRepository;
import com.mems.repository.SubjectRepository;
import com.mems.security.Actor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpecialtyServiceTest {

    @Mock
    private SpecialtyRepository repository;

    @Mock
    private SubjectRepository subjects;

    @Mock
    private Actor actor;

    private SpecialtyService service;

    @BeforeEach
    void setUp() {
        service = new SpecialtyService(repository, subjects, actor);
        org.mockito.Mockito.lenient().when(actor.orgId()).thenReturn("org-1");
        org.mockito.Mockito.lenient().when(actor.userId()).thenReturn("user-1");
    }

    @Test
    @DisplayName("Tạo chuyên môn kèm danh mục đang hoạt động")
    void createsWithActiveCategory() {
        when(subjects.activeCategoryName("org-1", "cat-1")).thenReturn("Lập trình");
        when(repository.existsName("org-1", "lap trinh web")).thenReturn(false);
        when(repository.create(anyString(), eq("org-1"), eq("Lập trình Web"), eq("lap trinh web"),
            eq("cat-1"), eq("user-1")))
            .thenReturn(new SpecialtyResponse("sp-1", "Lập trình Web", "cat-1"));

        SpecialtyResponse created = service.create(new SpecialtyCreateRequest("Lập trình Web", "cat-1"));

        assertThat(created.categoryId()).isEqualTo("cat-1");
    }

    @Test
    @DisplayName("Danh mục không thuộc tổ chức hoặc đã ngừng → SUBJECT_CATEGORY_INVALID")
    void rejectsUnknownOrInactiveCategory() {
        when(subjects.activeCategoryName("org-1", "cat-x")).thenReturn(null);

        assertThatThrownBy(() -> service.create(new SpecialtyCreateRequest("Lập trình Web", "cat-x")))
            .isInstanceOf(AppException.class)
            .extracting(ex -> ((AppException) ex).getCode()).isEqualTo("SUBJECT_CATEGORY_INVALID");
        verify(repository, never()).create(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Sửa chuyên môn giữ nguyên danh mục cũ dù danh mục đã ngừng hoạt động")
    void keepsInactiveCurrentCategory() {
        when(repository.require("sp-1", "org-1"))
            .thenReturn(new SpecialtyResponse("sp-1", "Lập trình Web", "cat-old"));
        when(repository.update("sp-1", "org-1", "Lập trình Web", "lap trinh web", "cat-old"))
            .thenReturn(new SpecialtyResponse("sp-1", "Lập trình Web", "cat-old"));

        SpecialtyResponse updated = service.update("sp-1",
            new SpecialtyUpdateRequest("Lập trình Web", "cat-old"));

        assertThat(updated.categoryId()).isEqualTo("cat-old");
        verify(subjects, never()).activeCategoryName(any(), any());
    }
}
