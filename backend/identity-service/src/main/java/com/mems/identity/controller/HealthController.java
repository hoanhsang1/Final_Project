package com.mems.identity.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {

    // Chạy xong mvn spring-boot:run, mở http://localhost:8081/health để xác nhận service + DB sống
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("service", "identity-service", "status", "UP");
    }
}
