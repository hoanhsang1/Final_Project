package com.mems.outbox;

import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.security.Actor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Tra cứu/replay event thất bại. Chỉ Owner của tổ chức; org luôn lấy từ JWT.
 * Dấu vết replay nằm ở cột replayed_at/replayed_by của outbox_event.
 */
@RestController
@RequestMapping("/outbox")
@PreAuthorize("hasRole('OWNER')")
public class OutboxAdminController {
    private final OutboxEventRepository repository;
    private final Actor actor;

    public OutboxAdminController(OutboxEventRepository repository, Actor actor) {
        this.repository = repository;
        this.actor = actor;
    }

    @GetMapping("/events")
    public List<OutboxEventRow> events(@RequestParam(required = false) String status,
                                       @RequestParam(defaultValue = "50") int limit,
                                       @RequestParam(defaultValue = "0") long afterId) {
        int capped = Math.max(1, Math.min(limit, 200));
        return repository.list(actor.orgId(), status, capped, Math.max(afterId, 0));
    }

    @PostMapping("/events/{eventId}/replay")
    public Map<String, Object> replay(@PathVariable String eventId) {
        int updated = repository.replay(eventId, actor.orgId(), actor.userId());
        if (updated == 0) {
            throw new AppException(ErrorCode.CONFLICT,
                "Outbox event not found in this organization or not in FAILED state");
        }
        return Map.of("eventId", eventId, "status", "PENDING");
    }
}
