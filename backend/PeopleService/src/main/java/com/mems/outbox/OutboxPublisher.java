package com.mems.outbox;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;

import java.time.Instant;
import java.util.List;

/**
 * Gửi event outbox tới ScheduleService. At-least-once: lỗi tạm thời được retry có
 * backoff; hết số lần thử chuyển FAILED để tra cứu/replay, không xóa event.
 */
@Component
@ConditionalOnProperty(name = "outbox.publisher.enabled", havingValue = "true", matchIfMissing = true)
public class OutboxPublisher {
    private static final Logger log = LoggerFactory.getLogger(OutboxPublisher.class);
    private static final long MAX_BACKOFF_SECONDS = 3600;

    private final OutboxEventRepository repository;
    private final EventRelayClient relay;
    private final int batchSize;
    private final int maxAttempts;
    private final long lockSeconds;

    public OutboxPublisher(OutboxEventRepository repository, EventRelayClient relay,
                           @Value("${outbox.publisher.batch-size:50}") int batchSize,
                           @Value("${outbox.publisher.max-attempts:12}") int maxAttempts,
                           @Value("${outbox.publisher.lock-seconds:60}") long lockSeconds) {
        this.repository = repository;
        this.relay = relay;
        this.batchSize = batchSize;
        this.maxAttempts = maxAttempts;
        this.lockSeconds = lockSeconds;
    }

    @Scheduled(fixedDelayString = "${outbox.publisher.interval-ms:5000}",
        initialDelayString = "${outbox.publisher.initial-delay-ms:15000}")
    public void publishDue() {
        Instant now = Instant.now();
        repository.reclaimStale(now);
        List<OutboxEventRow> due = repository.findDue(now, batchSize);
        for (OutboxEventRow row : due) {
            if (!repository.claim(row.eventId(), now.plusSeconds(lockSeconds))) continue;
            deliver(row);
        }
    }

    private void deliver(OutboxEventRow row) {
        try {
            relay.send(row);
            repository.markPublished(row.eventId());
        } catch (HttpStatusCodeException ex) {
            int status = ex.getStatusCode().value();
            if (status == 409) {
                retry(row, "Schedule is busy: " + status);
            } else if (status >= 400 && status < 500) {
                log.warn("Outbox event {} rejected with {}", row.eventId(), status);
                repository.reschedule(row.eventId(), "FAILED", row.attempts() + 1,
                    Instant.now(), ex.getResponseBodyAsString());
            } else {
                retry(row, ex.getResponseBodyAsString());
            }
        } catch (RestClientException ex) {
            retry(row, ex.getMessage());
        }
    }

    private void retry(OutboxEventRow row, String error) {
        int attempts = row.attempts() + 1;
        Instant next = Instant.now().plusSeconds(backoffSeconds(attempts));
        String status = attempts >= maxAttempts ? "FAILED" : "PENDING";
        repository.reschedule(row.eventId(), status, attempts, next, error);
        log.warn("Outbox event {} attempt {} -> {}: {}", row.eventId(), attempts, status, error);
    }

    private long backoffSeconds(int attempts) {
        long delay = 5L << Math.min(Math.max(attempts - 1, 0), 20);
        return Math.min(delay, MAX_BACKOFF_SECONDS);
    }
}
