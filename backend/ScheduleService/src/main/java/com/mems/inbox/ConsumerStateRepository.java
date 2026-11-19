package com.mems.inbox;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

/** Trạng thái aggregate mới nhất mà consumer đã áp dụng, để chặn event đến trễ. */
@Repository
public class ConsumerStateRepository {
    public record StateRow(Long lastVersion, Instant lastOccurredAt) {}

    private final JdbcTemplate jdbc;

    public ConsumerStateRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public StateRow find(String consumerName, String aggregateType, String aggregateId) {
        List<StateRow> rows = jdbc.query("""
            SELECT last_version, last_occurred_at FROM consumer_aggregate_state
            WHERE consumer_name=? AND aggregate_type=? AND aggregate_id=?
            """, (rs, n) -> new StateRow(
            rs.getObject("last_version") == null ? null : rs.getLong("last_version"),
            rs.getTimestamp("last_occurred_at") == null
                ? null : rs.getTimestamp("last_occurred_at").toInstant()),
            consumerName, aggregateType, aggregateId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public void upsert(String consumerName, String aggregateType, String aggregateId,
                       Long version, Instant occurredAt) {
        Timestamp at = occurredAt == null ? null : Timestamp.from(occurredAt);
        int updated = jdbc.update("""
            UPDATE consumer_aggregate_state SET last_version=?, last_occurred_at=?
            WHERE consumer_name=? AND aggregate_type=? AND aggregate_id=?
            """, version, at, consumerName, aggregateType, aggregateId);
        if (updated > 0) return;
        try {
            jdbc.update("""
                INSERT INTO consumer_aggregate_state(consumer_name, aggregate_type, aggregate_id,
                                                     last_version, last_occurred_at)
                VALUES (?,?,?,?,?)
                """, consumerName, aggregateType, aggregateId, version, at);
        } catch (DuplicateKeyException concurrent) {
            jdbc.update("""
                UPDATE consumer_aggregate_state SET last_version=?, last_occurred_at=?
                WHERE consumer_name=? AND aggregate_type=? AND aggregate_id=?
                """, version, at, consumerName, aggregateType, aggregateId);
        }
    }
}
