package com.mems.service;

import com.mems.repository.GeneralManagerRepository;
import com.mems.repository.TransferRepository;
import com.mems.security.Actor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** RBAC-02: chính sách duyệt nhận diện chức danh theo system_code, không theo tên hiển thị. */
@JdbcTest
class PositionSystemCodeTest {
    private static final String ORG = "org-1";
    private static final Instant NOW = Instant.parse("2026-11-19T00:00:00Z");

    @Autowired
    private JdbcTemplate jdbc;

    private TransferRepository transfers;
    private GeneralManagerRepository managers;
    private ClassApprovalPolicy policy;

    @BeforeEach
    void setUp() {
        transfers = new TransferRepository(jdbc);
        managers = new GeneralManagerRepository(jdbc);
        Actor actor = mock(Actor.class);
        when(actor.orgId()).thenReturn(ORG);
        when(actor.userId()).thenReturn("someone-else");
        when(actor.owner()).thenReturn(false);
        policy = new ClassApprovalPolicy(jdbc, actor);

        jdbc.update("INSERT INTO department(id,org_id,name,created_at) VALUES ('dept-1',?,'Phòng 1',?)",
            ORG, Timestamp.from(NOW));
        jdbc.update("INSERT INTO department_module(department_id,org_id,module_code)"
            + " VALUES ('dept-1',?,'STUDENT_MANAGEMENT')", ORG);
        jdbc.update("""
            INSERT INTO position(id,org_id,name,system_code,created_at,profile_type,scope,department_id)
            VALUES ('pos-head',?,'Chủ nhiệm bộ môn','DEPT_HEAD',?,'GENERAL','DEPARTMENT','dept-1')
            """, ORG, Timestamp.from(NOW));
        jdbc.update("""
            INSERT INTO assignment(id,org_id,user_id,position_id,scope_type,department_id,
                effective_from,status,assigned_by,created_at)
            VALUES ('a-head',?,'head-user','pos-head','DEPARTMENT','dept-1',?,'ACTIVE','owner-1',?)
            """, ORG, Timestamp.from(NOW), Timestamp.from(NOW));
        jdbc.update("""
            INSERT INTO position(id,org_id,name,system_code,created_at,profile_type,scope)
            VALUES ('pos-gm',?,'Điều hành cấp cao','GENERAL_MANAGER',?,'GENERAL','ORGANIZATION')
            """, ORG, Timestamp.from(NOW));
        jdbc.update("""
            INSERT INTO assignment(id,org_id,user_id,position_id,scope_type,department_id,
                effective_from,status,assigned_by,created_at)
            VALUES ('a-gm',?,'gm-user','pos-gm','ORGANIZATION',NULL,?,'ACTIVE','owner-1',?)
            """, ORG, Timestamp.from(NOW), Timestamp.from(NOW));
    }

    @Test
    @DisplayName("Trưởng phòng được nhận theo system_code dù tên chức danh khác")
    void classApprovalFindsHeadBySystemCode() {
        assertThat(policy.responsibleHeadIds(ORG)).containsExactly("head-user");
    }

    @Test
    @DisplayName("Transfer nhận trưởng phòng theo system_code")
    void transferFindsHeadBySystemCode() {
        assertThat(transfers.headHolders(ORG, "dept-1", List.of("Trưởng phòng")))
            .containsExactly("head-user");
        assertThat(transfers.isHead(ORG, "head-user", List.of("Trưởng phòng"))).isTrue();
    }

    @Test
    @DisplayName("Tổng quản lý được nhận theo system_code")
    void generalManagerResolvedBySystemCode() {
        assertThat(managers.isGeneralManager(ORG, "gm-user", "Tổng quản lý")).isTrue();
        assertThat(managers.findPositionId(ORG, "Tổng quản lý")).isEqualTo("pos-gm");
    }

    @Test
    @DisplayName("Chức danh không có system_code vẫn khớp theo tên cũ (fallback)")
    void legacyNameStillMatches() {
        jdbc.update("""
            INSERT INTO position(id,org_id,name,created_at,profile_type,scope,department_id)
            VALUES ('pos-legacy',?,'Trưởng phòng',?,'GENERAL','DEPARTMENT','dept-1')
            """, ORG, Timestamp.from(NOW));
        jdbc.update("""
            INSERT INTO assignment(id,org_id,user_id,position_id,scope_type,department_id,
                effective_from,status,assigned_by,created_at)
            VALUES ('a-legacy',?,'legacy-head','pos-legacy','DEPARTMENT','dept-1',?,'ACTIVE','owner-1',?)
            """, ORG, Timestamp.from(NOW), Timestamp.from(NOW));

        assertThat(policy.responsibleHeadIds(ORG)).contains("legacy-head");
        assertThat(transfers.headHolders(ORG, "dept-1", List.of("Trưởng phòng")))
            .contains("legacy-head");
    }
}
