package com.mems.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@JdbcTest
class OutboxEventRepositoryTest {
    private static final Instant NOW = Instant.parse("2026-11-20T00:00:00Z");

    @Autowired
    private JdbcTemplate jdbc;

    private OutboxEventRepository repository;

    @BeforeEach
    void setUp() {
        repository = new OutboxEventRepository(jdbc, new ObjectMapper());
        jdbc.update("DELETE FROM outbox_event");
    }

    @Test
    @DisplayName("append ghi event PENDING kèm payload JSON và tìm được ngay")
    void appendStoresPendingEvent() {
        String eventId = repository.append("org-1", "CLASS", "class-1", 3L,
            "ClassTeacherChanged", 1, "corr-1", Map.of("classId", "class-1"));

        List<OutboxEventRow> due = repository.findDue(NOW.plusSeconds(1), 10);

        assertThat(due).hasSize(1);
        OutboxEventRow row = due.get(0);
        assertThat(row.eventId()).isEqualTo(eventId);
        assertThat(row.status()).isEqualTo("PENDING");
        assertThat(row.attempts()).isZero();
        assertThat(row.payload()).contains("\"classId\":\"class-1\"");
        assertThat(row.organizationId()).isEqualTo("org-1");
        assertThat(row.correlationId()).isEqualTo("corr-1");
    }

    @Test
    @DisplayName("claim loại trừ: publisher thứ hai nhận false cho cùng event")
    void claimIsExclusive() {
        String eventId = repository.append("org-1", "CLASS", "class-1", 1L,
            "ClassTeacherChanged", 1, null, Map.of());

        assertThat(repository.claim(eventId, NOW.plusSeconds(60))).isTrue();
        assertThat(repository.claim(eventId, NOW.plusSeconds(60))).isFalse();
        assertThat(repository.findDue(NOW.plusSeconds(1), 10)).isEmpty();
    }

    @Test
    @DisplayName("reschedule FAILED rồi replay chỉ khi đúng tổ chức")
    void replayOnlyFailedEventOfSameOrganization() {
        String eventId = repository.append("org-1", "CLASS", "class-1", 1L,
            "ClassTeacherChanged", 1, null, Map.of());
        repository.reschedule(eventId, "FAILED", 12, NOW, "rejected");

        assertThat(repository.replay(eventId, "org-2", "owner-2")).isZero();
        assertThat(repository.replay(eventId, "org-1", "owner-1")).isEqualTo(1);

        OutboxEventRow row = repository.find(eventId);
        assertThat(row.status()).isEqualTo("PENDING");
        assertThat(row.attempts()).isZero();
        assertThat(row.lastError()).isNull();
    }

    @Test
    @DisplayName("replay bỏ qua event đang PENDING/PUBLISHED")
    void replayRejectsNonFailedEvents() {
        String eventId = repository.append("org-1", "CLASS", "class-1", 1L,
            "ClassTeacherChanged", 1, null, Map.of());

        assertThat(repository.replay(eventId, "org-1", "owner-1")).isZero();
        repository.markPublished(eventId);
        assertThat(repository.replay(eventId, "org-1", "owner-1")).isZero();
    }

    @Test
    @DisplayName("reclaimStale trả event kẹt PUBLISHING về PENDING và tăng attempts")
    void reclaimsStalePublishingRow() {
        String eventId = repository.append("org-1", "CLASS", "class-1", 1L,
            "ClassTeacherChanged", 1, null, Map.of());
        repository.claim(eventId, NOW.plusSeconds(30));

        assertThat(repository.reclaimStale(NOW.plusSeconds(31))).isEqualTo(1);
        OutboxEventRow row = repository.find(eventId);
        assertThat(row.status()).isEqualTo("PENDING");
        assertThat(row.attempts()).isEqualTo(1);
    }

    @Test
    @DisplayName("list lọc theo tổ chức, trạng thái và phân trang afterId")
    void listFiltersByOrganizationAndStatus() {
        String first = repository.append("org-1", "CLASS", "class-1", 1L,
            "ClassTeacherChanged", 1, null, Map.of());
        String second = repository.append("org-1", "CLASS", "class-2", 1L,
            "ClassTeacherChanged", 1, null, Map.of());
        repository.append("org-2", "CLASS", "class-3", 1L,
            "ClassTeacherChanged", 1, null, Map.of());
        repository.reschedule(second, "FAILED", 12, NOW, "rejected");

        assertThat(repository.list("org-1", null, 10, 0)).hasSize(2);
        assertThat(repository.list("org-1", "FAILED", 10, 0)).hasSize(1);
        assertThat(repository.list("org-1", null, 10, idOf(first))).hasSize(1);
        assertThat(repository.list("org-2", null, 10, 0)).hasSize(1);
    }

    private long idOf(String eventId) {
        Long id = jdbc.queryForObject("SELECT id FROM outbox_event WHERE event_id=?",
            Long.class, eventId);
        return id == null ? 0 : id;
    }
}
