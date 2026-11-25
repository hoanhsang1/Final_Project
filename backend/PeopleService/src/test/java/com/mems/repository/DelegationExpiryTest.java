package com.mems.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/** DEL-04: chỉ ủy quyền quá hạn còn ACTIVE mới bị chuyển EXPIRED. */
@JdbcTest
class DelegationExpiryTest {
    private static final Instant NOW = Instant.parse("2026-11-19T00:00:00Z");

    @Autowired
    private JdbcTemplate jdbc;

    private DelegationRepository repository;

    @BeforeEach
    void setUp() {
        repository = new DelegationRepository(jdbc);
        insert("del-expired", "ACTIVE", NOW.minusSeconds(86_400));
        insert("del-open", "ACTIVE", null);
        insert("del-future", "ACTIVE", NOW.plusSeconds(86_400));
        insert("del-revoked", "REVOKED", NOW.minusSeconds(86_400));
    }

    private void insert(String id, String status, Instant effectiveTo) {
        jdbc.update("""
            INSERT INTO delegation(id,org_id,delegator_id,delegate_id,scope,effective_from,
                effective_to,status,created_by,created_at)
            VALUES (?, 'org-1','owner-1','gm-1','ORGANIZATION',?,?,?,'owner-1',?)
            """, id, Timestamp.from(NOW.minusSeconds(172_800)),
            effectiveTo == null ? null : Timestamp.from(effectiveTo), status, Timestamp.from(NOW));
    }

    @Test
    @DisplayName("markExpired chỉ đổi ủy quyền quá hạn, chạy lại không đổi thêm")
    void marksOnlyOverdueActiveDelegations() {
        assertThat(repository.markExpired()).isEqualTo(1);
        assertThat(status("del-expired")).isEqualTo("EXPIRED");
        assertThat(status("del-open")).isEqualTo("ACTIVE");
        assertThat(status("del-future")).isEqualTo("ACTIVE");
        assertThat(status("del-revoked")).isEqualTo("REVOKED");
        assertThat(repository.markExpired()).isZero();
    }

    private String status(String id) {
        return jdbc.queryForObject("SELECT status FROM delegation WHERE id=?", String.class, id);
    }
}
