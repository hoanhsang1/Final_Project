package com.mems.service;

import com.mems.dto.NotificationResponse;
import com.mems.repository.NotificationRepository;
import com.mems.security.Actor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;

/**
 * Thông báo trong hệ thống — thay cho email khi chưa có mail worker (Phần 5).
 * Mỗi thông báo thuộc đúng một người dùng trong tổ chức.
 */
@Service
public class NotificationService {
    private static final int DEFAULT_LIMIT = 50;

    private final Actor actor;
    private final NotificationRepository notifications;

    public NotificationService(Actor actor, NotificationRepository notifications) {
        this.actor = actor;
        this.notifications = notifications;
    }

    public void notify(String orgId, String userId, String type, String title, String body,
                       String entityType, String entityId) {
        if (userId == null || userId.isBlank()) return;
        notifications.create(orgId, userId, type, title, body, entityType, entityId);
    }

    public void notifyAll(String orgId, Collection<String> userIds, String type, String title,
                          String body, String entityType, String entityId) {
        if (userIds == null) return;
        userIds.stream().filter(id -> id != null && !id.isBlank()).distinct()
            .forEach(id -> notify(orgId, id, type, title, body, entityType, entityId));
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> mine() {
        return notifications.list(actor.orgId(), actor.userId(), DEFAULT_LIMIT);
    }

    @Transactional
    public void markRead(String id) {
        notifications.markRead(actor.orgId(), actor.userId(), id);
    }

    @Transactional
    public int markAllRead() {
        return notifications.markAllRead(actor.orgId(), actor.userId());
    }
}
