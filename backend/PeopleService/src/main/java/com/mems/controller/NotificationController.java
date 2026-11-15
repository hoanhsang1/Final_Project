package com.mems.controller;

import com.mems.dto.NotificationResponse;
import com.mems.service.NotificationService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Hộp thông báo của chính người đang đăng nhập. */
@RestController
@RequestMapping("/notifications")
public class NotificationController {
    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping
    public List<NotificationResponse> mine() {
        return service.mine();
    }

    @PostMapping("/{id}/read")
    public void markRead(@PathVariable String id) {
        service.markRead(id);
    }

    @PostMapping("/read-all")
    public Map<String, Integer> markAllRead() {
        return Map.of("updated", service.markAllRead());
    }
}
