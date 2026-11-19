package com.mems.controller;

import com.mems.dto.EventEnvelope;
import com.mems.service.ScheduleEventConsumer;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Endpoint nội bộ cho outbox publisher của People/Facility. Bảo vệ bằng X-Internal-Api-Key. */
@RestController
@RequestMapping("/internal")
public class InternalEventController {
    private final ScheduleEventConsumer consumer;

    public InternalEventController(ScheduleEventConsumer consumer) {
        this.consumer = consumer;
    }

    @PostMapping("/events")
    public Map<String, Object> receive(@RequestBody EventEnvelope event) {
        consumer.handle(event);
        return Map.of("eventId", event.eventId(), "status", "PROCESSED");
    }
}
