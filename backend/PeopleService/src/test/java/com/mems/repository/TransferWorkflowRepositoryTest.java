package com.mems.repository;

import com.mems.service.EffectivePermissionsService;
import com.mems.service.TransferService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

@JdbcTest
class TransferWorkflowRepositoryTest {
    private static final Instant NOW = Instant.parse("2026-11-13T00:00:00Z");

    @Autowired
    private JdbcTemplate jdbc;

    private TransferRepository transfers;
    private MemberRepository members;

    @BeforeEach
    void setUp() {
        transfers = new TransferRepository(jdbc);
        members = new MemberRepository(jdbc, mock(EffectivePermissionsService.class),
            mock(AssignmentRepository.class));

        jdbc.update("INSERT INTO department(id,org_id,name,created_at) VALUES ('dept-old','org-1','Phòng cũ',?)",
            Timestamp.from(NOW));
        jdbc.update("INSERT INTO department(id,org_id,name,created_at) VALUES ('dept-new','org-1','Phòng mới',?)",
            Timestamp.from(NOW));
        jdbc.update("""
            INSERT INTO position(id,org_id,name,created_at,profile_type,scope,department_id)
            VALUES ('pos-org','org-1','Quản trị viên tổ chức',?,'GENERAL','ORGANIZATION',NULL)
            """, Timestamp.from(NOW));
        jdbc.update("""
            INSERT INTO position(id,org_id,name,created_at,profile_type,scope,department_id)
            VALUES ('pos-head','org-1','Trưởng phòng ban',?,'GENERAL','DEPARTMENT','dept-old')
            """, Timestamp.from(NOW));
        jdbc.update("""
            INSERT INTO department_member(user_id,org_id,department_id,role,appointed_by,appointed_at,username)
            VALUES ('u1','org-1','dept-old','STAFF','owner-1',?,'u1')
            """, Timestamp.from(NOW));
        jdbc.update("""
            INSERT INTO assignment(id,org_id,user_id,position_id,scope_type,department_id,
                effective_from,status,assigned_by,created_at)
            VALUES ('a-org','org-1','u1','pos-org','ORGANIZATION',NULL,?,'ACTIVE','owner-1',?)
            """, Timestamp.from(NOW), Timestamp.from(NOW));
        jdbc.update("""
            INSERT INTO assignment(id,org_id,user_id,position_id,scope_type,department_id,
                effective_from,status,assigned_by,created_at)
            VALUES ('a-head','org-1','u1','pos-head','DEPARTMENT','dept-old',?,'ACTIVE','owner-1',?)
            """, Timestamp.from(NOW), Timestamp.from(NOW));
        jdbc.update("INSERT INTO member_position(user_id,position_id,org_id) VALUES ('u1','pos-org','org-1')");
        jdbc.update("INSERT INTO member_position(user_id,position_id,org_id) VALUES ('u1','pos-head','org-1')");
    }

    @Test
    @DisplayName("Chuyển phòng thu hồi chức danh DEPARTMENT phòng cũ, giữ ORGANIZATION")
    void transferKeepsOrganizationAssignments() {
        int revoked = members.transferToDepartment("u1", "org-1", "dept-old", "dept-new",
            "hr-1", "Chuyển phòng ban");

        assertThat(revoked).isEqualTo(1);
        assertThat(jdbc.queryForObject(
            "SELECT status FROM assignment WHERE id='a-org'", String.class)).isEqualTo("ACTIVE");
        assertThat(jdbc.queryForObject(
            "SELECT status FROM assignment WHERE id='a-head'", String.class)).isEqualTo("REVOKED");
        assertThat(jdbc.queryForList(
            "SELECT position_id FROM member_position WHERE user_id='u1'", String.class))
            .containsExactly("pos-org");
        assertThat(jdbc.queryForObject(
            "SELECT department_id FROM department_member WHERE user_id='u1'", String.class))
            .isEqualTo("dept-new");
    }

    @Test
    @DisplayName("Trưởng phòng nhận cả tên 'Trưởng phòng' và tên seed cũ 'Trưởng phòng ban'")
    void headResolverAcceptsBothNames() {
        assertThat(transfers.headHolders("org-1", "dept-old",
            TransferService.HEAD_POSITION_NAMES)).containsExactly("u1");
        assertThat(transfers.headHolders("org-1", "dept-old", List.of("Trưởng phòng"))).isEmpty();
    }

    @Test
    @DisplayName("Yêu cầu chuyển phòng: 4 bước PENDING, bước chỉ quyết định một lần")
    void transferStepsAreDecidedOnce() {
        transfers.create("r1", "org-1", "u1", "dept-old", "dept-new", "Lý do", "requester");

        assertThat(transfers.hasPending("org-1", "u1")).isTrue();
        assertThat(transfers.require("r1", "org-1").steps())
            .extracting(step -> step.step())
            .containsExactly("SOURCE_HEAD", "TARGET_HEAD", "HR", "EMPLOYEE");
        assertThat(transfers.decideStep("r1", "SOURCE_HEAD", "APPROVED", "head-1", null)).isTrue();
        assertThat(transfers.decideStep("r1", "SOURCE_HEAD", "REJECTED", "head-2", null)).isFalse();
    }

    @Test
    @DisplayName("Đánh dấu cần phân công lại chỉ áp dụng cho lớp chưa kết thúc")
    void marksOnlyActiveClasses() {
        SchoolClassRepository classes = new SchoolClassRepository(jdbc);
        insertClass("c1", "DANG_DIEN_RA");
        insertClass("c2", "DA_KET_THUC");

        int updated = classes.markNeedsReassignment("org-1", "u1", "Chuyển phòng ban");

        assertThat(updated).isEqualTo(1);
        assertThat(jdbc.queryForObject(
            "SELECT needs_reassignment FROM school_class WHERE id='c1'", Boolean.class)).isTrue();
        assertThat(jdbc.queryForObject(
            "SELECT needs_reassignment FROM school_class WHERE id='c2'", Boolean.class)).isFalse();
    }

    private void insertClass(String id, String status) {
        jdbc.update("""
            INSERT INTO school_class(id,org_id,class_code,name,status,teacher_id,version,close_state,created_by,created_at)
            VALUES (?, 'org-1', ?, ?, ?, 'u1', 0, 'NONE', 'owner-1', ?)
            """, id, id, id, status, Timestamp.from(NOW));
    }
}
