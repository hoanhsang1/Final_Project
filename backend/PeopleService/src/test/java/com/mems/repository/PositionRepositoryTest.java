package com.mems.repository;

import com.mems.exception.AppException;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@JdbcTest
class PositionRepositoryTest {
    private static final Instant NOW = Instant.parse("2026-11-13T00:00:00Z");

    @Autowired
    private JdbcTemplate jdbc;

    private PositionRepository positions;

    @BeforeEach
    void setUp() {
        positions = new PositionRepository(jdbc);
        Timestamp now = Timestamp.from(NOW);
        jdbc.update("INSERT INTO department(id,org_id,name,created_at) VALUES ('dept-1','org-1','Phòng 1',?)", now);
        jdbc.update("""
            INSERT INTO `position`(id,org_id,name,created_at,scope,department_id)
            VALUES ('pos-1','org-1','Chức danh 1',?,'DEPARTMENT','dept-1')
            """, now);
        jdbc.update("""
            INSERT INTO `position`(id,org_id,name,created_at,scope,department_id)
            VALUES ('pos-org','org-1','Chức danh tổ chức',?,'ORGANIZATION',NULL)
            """, now);
        jdbc.update("""
            INSERT INTO department_member(user_id,org_id,department_id,role,appointed_by,appointed_at)
            VALUES ('user-1','org-1','dept-1','STAFF','admin',?)
            """, now);
        jdbc.update("""
            INSERT INTO department_member(user_id,org_id,department_id,role,appointed_by,appointed_at)
            VALUES ('user-2','org-1','dept-1','STAFF','admin',?)
            """, now);
    }

    @Test
    @DisplayName("Xoá chức danh đang có người giữ (assignment ACTIVE) → POSITION_IN_USE")
    void deleteRejectsPositionInUse() {
        jdbc.update("""
            INSERT INTO assignment(id,org_id,user_id,position_id,scope_type,department_id,
                effective_from,status,assigned_by,created_at)
            VALUES ('a-1','org-1','user-1','pos-1','DEPARTMENT','dept-1',?,'ACTIVE','admin',?)
            """, Timestamp.from(NOW), Timestamp.from(NOW));

        assertThatThrownBy(() -> positions.delete("pos-1", "org-1"))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode()).isEqualTo("POSITION_IN_USE"));
    }

    @Test
    @DisplayName("Xoá chức danh khi assignment đã REVOKED → thành công")
    void deleteAllowsPositionWithoutActiveAssignment() {
        jdbc.update("""
            INSERT INTO assignment(id,org_id,user_id,position_id,scope_type,department_id,
                effective_from,status,assigned_by,created_at)
            VALUES ('a-1','org-1','user-1','pos-1','DEPARTMENT','dept-1',?,'REVOKED','admin',?)
            """, Timestamp.from(NOW), Timestamp.from(NOW));

        positions.delete("pos-1", "org-1");

        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM `position` WHERE id='pos-1' AND deleted_at IS NULL", Integer.class))
            .isZero();
        assertThatThrownBy(() -> positions.require("pos-1", "org-1", false))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode()).isEqualTo("POSITION_NOT_FOUND"));
    }

    @Test
    @DisplayName("distinctHolders đếm người khác nhau đang giữ chức danh")
    void distinctHoldersCountsUsers() {
        jdbc.update("""
            INSERT INTO assignment(id,org_id,user_id,position_id,scope_type,department_id,
                effective_from,status,assigned_by,created_at)
            VALUES ('a-1','org-1','user-1','pos-1','DEPARTMENT','dept-1',?,'ACTIVE','admin',?)
            """, Timestamp.from(NOW), Timestamp.from(NOW));
        jdbc.update("""
            INSERT INTO assignment(id,org_id,user_id,position_id,scope_type,department_id,
                effective_from,status,assigned_by,created_at)
            VALUES ('a-2','org-1','user-2','pos-1','DEPARTMENT','dept-1',?,'ACTIVE','admin',?)
            """, Timestamp.from(NOW), Timestamp.from(NOW));

        assertThat(positions.distinctHolders("org-1", List.of("pos-1"))).isEqualTo(2);
    }

    @Test
    @DisplayName("listByDepartment chỉ trả chức danh DEPARTMENT của đúng phòng")
    void listByDepartmentFiltersScopeAndDepartment() {
        assertThat(positions.listByDepartment("org-1", "dept-1"))
            .extracting(p -> p.id())
            .containsExactly("pos-1");
    }
}
