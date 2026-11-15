package com.mems.dto;

import java.time.Instant;

/** Thông báo trong hệ thống (thay cho email khi chưa có mail worker). */
public record NotificationResponse(
    String id,
    String type,
    String title,
    String body,
    String entityType,
    String entityId,
    Instant readAt,
    Instant createdAt
) {}
