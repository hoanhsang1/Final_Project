package com.mems.repository;

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

@JdbcTest
class GeneralManagerRepositoryTest {
    private static final String ORG = "org-1";
    private static final String USER = "user-1";
    private static final String POSITION = "pos-gm";
    private static final String NAME = "Tổng quản lý";

    @Autowired
    private JdbcTemplate jdbc;

    private GeneralManagerRepository managers;

    @BeforeEach
    void setUp() {
        managers = new GeneralManagerRepository(jdbc);
        Timestamp now = Timestamp.from(Instant.parse("2026-11-16T00:00:00Z"));
        jdbc.update("INSERT INTO department(id,org_id,name,created_at) VALUES ('dept-1',?,'Phòng 1',?)",
            ORG, now);
        jdbc.update("""
            INSERT INTO department_member(user_id,org_id,department_id,role,appointed_by,appointed_at,status)
            VALUES (?,?,'dept-1','STAFF','owner',?,'ACTIVE')
            """, USER, ORG, now);
        // Chức danh do bản cũ tạo: mặc định DEPARTMENT dù đây là chức danh tổ chức.
        jdbc.update("""
            INSERT INTO `position`(id,org_id,name,created_at,profile_type,scope)
            VALUES (?,?,?,?,'GENERAL','DEPARTMENT')
            """, POSITION, ORG, NAME, now);
    }

    @Test
    @DisplayName("findPositionId nâng chức danh Tổng quản lý cũ lên scope ORGANIZATION")
    void findPositionIdUpgradesLegacyScope() {
        String id = managers.findPositionId(ORG, NAME);

        assertThat(id).isEqualTo(POSITION);
        assertThat(jdbc.queryForObject(
            "SELECT scope FROM `position` WHERE id=?", String.class, POSITION))
            .isEqualTo("ORGANIZATION");
    }

    @Test
    @DisplayName("Bổ nhiệm đọc lại được ngay trong cùng luồng")
    void appointReadBackFindsNewManager() {
        String positionId = managers.findPositionId(ORG, NAME);
        managers.addAssignment(ORG, USER, positionId, "owner", "Bổ nhiệm thử");

        List<?> listed = managers.list(ORG, NAME);

        assertThat(listed).hasSize(1);
    }

    @Test
    @DisplayName("Assignment cũ đã hết hiệu lực không chặn lần bổ nhiệm mới")
    void reappointAfterExpiredAssignment() {
        String positionId = managers.findPositionId(ORG, NAME);
        Timestamp past = Timestamp.from(Instant.parse("2026-01-01T00:00:00Z"));
        jdbc.update("""
            INSERT INTO assignment(id,org_id,user_id,position_id,scope_type,department_id,
                effective_from,effective_to,status,assigned_by,created_at)
            VALUES ('a-old',?,?,?,'ORGANIZATION',NULL,?,?,'ACTIVE','owner',?)
            """, ORG, USER, positionId, past, past, past);

        managers.addAssignment(ORG, USER, positionId, "owner", "Bổ nhiệm lại");

        assertThat(managers.list(ORG, NAME)).hasSize(1);
    }
}
