package com.mems.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.TextNode;
import com.mems.dto.AuditLogResponse;
import com.mems.repository.AuditLogRepository;
import com.mems.security.Actor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * CC-06: nhật ký thao tác trong phạm vi tổ chức. `orgId` luôn lấy từ JWT,
 * phân trang ở DB và che mọi trường nhạy cảm trước khi trả về.
 */
@Service
public class AuditLogService {
    private final AuditLogRepository repository;
    private final Actor actor;
    private final ObjectMapper mapper;

    public AuditLogService(AuditLogRepository repository, Actor actor, ObjectMapper mapper) {
        this.repository = repository;
        this.actor = actor;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> list(int page, int size, String action, String actorUserId,
                                    Instant from, Instant to) {
        String orgId = actor.orgId();
        int safePage = Math.max(page, 1);
        int safeSize = Math.min(Math.max(size, 1), 100);
        long total = repository.count(orgId, action, actorUserId, from, to);
        List<AuditLogResponse> items = repository.list(orgId, action, actorUserId, from, to,
                safeSize, (long) (safePage - 1) * safeSize).stream()
            .map(row -> new AuditLogResponse(row.id(), row.action(), row.actorUserId(),
                row.actorName(), row.targetId(), sanitize(row.details()), row.createdAt()))
            .toList();
        return Map.of("items", items, "total", total, "page", safePage, "size", safeSize);
    }

    private JsonNode sanitize(String details) {
        if (details == null || details.isBlank()) return null;
        try {
            return mask(mapper.readTree(details));
        } catch (Exception unreadable) {
            // Không đoán nội dung không parse được — tránh lộ chuỗi thô có thể chứa bí mật.
            return TextNode.valueOf("[unreadable]");
        }
    }

    private JsonNode mask(JsonNode node) {
        if (node.isObject()) {
            ObjectNode copy = mapper.createObjectNode();
            node.fields().forEachRemaining(field -> copy.set(field.getKey(),
                sensitive(field.getKey()) ? TextNode.valueOf("***") : mask(field.getValue())));
            return copy;
        }
        if (node.isArray()) {
            ArrayNode copy = mapper.createArrayNode();
            node.forEach(value -> copy.add(mask(value)));
            return copy;
        }
        return node;
    }

    private boolean sensitive(String key) {
        String k = key.toLowerCase(Locale.ROOT);
        return k.contains("password") || k.contains("token")
            || k.contains("secret") || k.contains("credential");
    }
}
