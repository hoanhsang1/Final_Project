package com.mems.outbox;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OutboxPublisherTest {
    private OutboxEventRepository repository;
    private EventRelayClient relay;
    private OutboxPublisher publisher;

    @BeforeEach
    void setUp() {
        repository = mock(OutboxEventRepository.class);
        relay = mock(EventRelayClient.class);
        publisher = new OutboxPublisher(repository, relay, 50, 12, 60);
    }

    @Test
    @DisplayName("Gửi thành công → PUBLISHED, không reschedule")
    void marksPublishedOnSuccess() {
        OutboxEventRow row = row("evt-1", 0);
        when(repository.findDue(any(), anyInt())).thenReturn(List.of(row));
        when(repository.claim(eq("evt-1"), any())).thenReturn(true);

        publisher.publishDue();

        verify(relay).send(row);
        verify(repository).markPublished("evt-1");
        verify(repository, never()).reschedule(anyString(), anyString(), anyInt(), any(), any());
    }

    @Test
    @DisplayName("Schedule bận (409) → giữ PENDING để thử lại")
    void retriesOnConflict() {
        OutboxEventRow row = row("evt-1", 2);
        when(repository.findDue(any(), anyInt())).thenReturn(List.of(row));
        when(repository.claim(eq("evt-1"), any())).thenReturn(true);
        doThrow(HttpClientErrorException.create(HttpStatus.CONFLICT, "busy",
            HttpHeaders.EMPTY, new byte[0], StandardCharsets.UTF_8)).when(relay).send(row);

        publisher.publishDue();

        verify(repository).reschedule(eq("evt-1"), eq("PENDING"), eq(3), any(), anyString());
        verify(repository, never()).markPublished(anyString());
    }

    @Test
    @DisplayName("Lỗi 4xx nghiệp vụ → FAILED để tra cứu/replay")
    void failsOnRejectedPayload() {
        OutboxEventRow row = row("evt-1", 0);
        when(repository.findDue(any(), anyInt())).thenReturn(List.of(row));
        when(repository.claim(eq("evt-1"), any())).thenReturn(true);
        doThrow(HttpClientErrorException.create(HttpStatus.BAD_REQUEST, "bad",
            HttpHeaders.EMPTY, "bad payload".getBytes(StandardCharsets.UTF_8),
            StandardCharsets.UTF_8)).when(relay).send(row);

        publisher.publishDue();

        verify(repository).reschedule(eq("evt-1"), eq("FAILED"), eq(1), any(), eq("bad payload"));
    }

    @Test
    @DisplayName("5xx và lỗi mạng → thử lại có backoff, chưa xóa event")
    void retriesOnServerAndNetworkErrors() {
        OutboxEventRow server = row("evt-1", 0);
        OutboxEventRow network = row("evt-2", 1);
        when(repository.findDue(any(), anyInt())).thenReturn(List.of(server, network));
        when(repository.claim(anyString(), any())).thenReturn(true);
        doThrow(HttpServerErrorException.create(HttpStatus.BAD_GATEWAY, "down",
            HttpHeaders.EMPTY, new byte[0], StandardCharsets.UTF_8)).when(relay).send(server);
        doThrow(new ResourceAccessException("timeout")).when(relay).send(network);

        publisher.publishDue();

        verify(repository).reschedule(eq("evt-1"), eq("PENDING"), eq(1), any(), any());
        verify(repository).reschedule(eq("evt-2"), eq("PENDING"), eq(2), any(), eq("timeout"));
    }

    @Test
    @DisplayName("Chạm trần số lần thử → FAILED thay vì thử vô hạn")
    void failsAfterMaxAttempts() {
        OutboxEventRow row = row("evt-1", 11);
        when(repository.findDue(any(), anyInt())).thenReturn(List.of(row));
        when(repository.claim(eq("evt-1"), any())).thenReturn(true);
        doThrow(new ResourceAccessException("timeout")).when(relay).send(row);

        publisher.publishDue();

        verify(repository).reschedule(eq("evt-1"), eq("FAILED"), eq(12), any(), any());
    }

    @Test
    @DisplayName("Publisher khác đã claim → bỏ qua, không gửi trùng")
    void skipsEventClaimedByAnotherPublisher() {
        OutboxEventRow row = row("evt-1", 0);
        when(repository.findDue(any(), anyInt())).thenReturn(List.of(row));
        when(repository.claim(eq("evt-1"), any())).thenReturn(false);

        publisher.publishDue();

        verify(relay, never()).send(any());
        assertThat(row.status()).isEqualTo("PENDING");
    }

    private OutboxEventRow row(String eventId, int attempts) {
        return new OutboxEventRow(eventId, "CLASS", "class-1", 1L, "ClassTeacherChanged", 1,
            "org-1", "corr-1", "{}", attempts, "PENDING", null, Instant.now());
    }
}
