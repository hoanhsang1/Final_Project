package com.mems.service;

import com.mems.client.IdentityClient;
import com.mems.repository.AssignmentRepository;
import com.mems.repository.PositionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/** DEL-03/6: chỉ ủy quyền còn hiệu lực tại thời điểm gọi mới cấp quyền. */
@JdbcTest
class DelegationGrantQueryTest {

    /** Mốc thời gian của lần chạy, không cố định — query so với {@code Instant.now()}. */
    private final Instant now = Instant.now();

    @Autowired
    private JdbcTemplate jdbc;

    private EffectivePermissionsService service;

    @BeforeEach
    void setUp() {
        service = new EffectivePermissionsService(jdbc, mock(IdentityClient.class),
            mock(AssignmentRepository.class), mock(PositionRepository.class));
    }

    private void delegation(String id, String status, Instant from, Instant to, String permission) {
        jdbc.update("""
            INSERT INTO delegation(id,org_id,delegator_id,delegate_id,scope,effective_from,effective_to,
                status,created_by,created_at)
            VALUES (?,?,?,?,'ORGANIZATION',?,?,?,?,?)
            """, id, "org-1", "owner-1", "gm-1", Timestamp.from(from),
            to == null ? null : Timestamp.from(to), status, "owner-1", Timestamp.from(now));
        jdbc.update("INSERT INTO delegation_permission(delegation_id,permission_code) VALUES (?,?)",
            id, permission);
    }

    @Test
    @DisplayName("Chỉ ủy quyền ACTIVE trong khoảng hiệu lực mới được trả về")
    void onlyActiveDelegationsAreReturned() {
        delegation("d-active", "ACTIVE", now.minusSeconds(60), null, "employee.view");
        delegation("d-future", "ACTIVE", now.plusSeconds(3_600), null, "student.view");
        delegation("d-expired", "ACTIVE", now.minusSeconds(7_200), now.minusSeconds(60), "class.view");
        delegation("d-revoked", "REVOKED", now.minusSeconds(60), null, "employee.edit");

        var grants = service.activeDelegationGrants("org-1", "gm-1");

        assertThat(grants).containsExactly(
            java.util.Map.entry("employee.view", "d-active"));
    }

    @Test
    @DisplayName("Hai ủy quyền cùng quyền: giữ id nhỏ nhất ổn định")
    void samePermissionKeepsStableSource() {
        delegation("d-2", "ACTIVE", now.minusSeconds(60), null, "employee.view");
        delegation("d-1", "ACTIVE", now.minusSeconds(60), null, "employee.view");

        var grants = service.activeDelegationGrants("org-1", "gm-1");

        assertThat(grants).containsEntry("employee.view", "d-1");
    }

    @Test
    @DisplayName("Ủy quyền của người khác hoặc tổ chức khác không được trả về")
    void grantsAreScopedToDelegateAndOrganization() {
        delegation("d-other-user", "ACTIVE", now.minusSeconds(60), null, "employee.view");
        jdbc.update("UPDATE delegation SET delegate_id='someone-else' WHERE id='d-other-user'");

        assertThat(service.activeDelegationGrants("org-1", "gm-1")).isEmpty();
        assertThat(service.activeDelegationGrants("org-2", "gm-1")).isEmpty();
    }
}
