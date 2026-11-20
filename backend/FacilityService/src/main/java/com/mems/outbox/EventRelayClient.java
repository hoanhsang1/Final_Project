package com.mems.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

/** Gửi envelope sang ScheduleService qua API nội bộ có X-Internal-Api-Key. */
@Component
public class EventRelayClient {
    private final RestTemplate http;
    private final ObjectMapper mapper;

    public EventRelayClient(RestTemplateBuilder builder, ObjectMapper mapper,
                            @Value("${SCHEDULE_SERVICE_URL:http://localhost:8083}") String baseUrl,
                            @Value("${INTERNAL_API_KEY:}") String internalKey) {
        this.mapper = mapper;
        this.http = builder.rootUri(baseUrl)
            .defaultHeader("X-Internal-Api-Key", internalKey)
            .setConnectTimeout(Duration.ofSeconds(3))
            .setReadTimeout(Duration.ofSeconds(5))
            .build();
    }

    public void send(OutboxEventRow row) throws RestClientException {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("eventId", row.eventId());
        body.put("eventType", row.eventType());
        body.put("eventVersion", row.eventVersion());
        body.put("organizationId", row.organizationId());
        body.put("aggregateType", row.aggregateType());
        body.put("aggregateId", row.aggregateId());
        body.put("aggregateVersion", row.aggregateVersion());
        body.put("occurredAt", row.createdAt().toString());
        body.put("correlationId", row.correlationId());
        body.put("payload", readPayload(row.payload()));
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        http.exchange("/internal/events", HttpMethod.POST, new HttpEntity<>(body, headers),
            String.class);
    }

    private Object readPayload(String payload) {
        try {
            return mapper.readTree(payload);
        } catch (Exception ex) {
            throw new IllegalStateException("Stored outbox payload is not valid JSON", ex);
        }
    }
}
