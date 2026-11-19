package com.mems.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;

/** Một dòng nhật ký tổ chức; `details` đã được che dữ liệu nhạy cảm. */
public record AuditLogResponse(
    String id,
    String action,
    String actorUserId,
    String actorName,
    String targetId,
    JsonNode details,
    Instant createdAt) {}
