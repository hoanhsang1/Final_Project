package com.mems.client;

import com.mems.dto.AccessProfile;

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;

/**
 * Cache last-known-good cho hồ sơ quyền lấy từ PeopleService (AUTH-11).
 *
 * <p>Bản ghi tươi được dùng bình thường; sau ngưỡng tươi vẫn dùng lại được tới
 * hạn cứng nhưng bị đánh dấu {@code stale}. Quá hạn cứng thì bỏ — không bao giờ
 * dùng snapshot vô hạn.</p>
 */
class AccessProfileCache {
    private static final int MAX_ENTRIES = 10_000;

    private record Entry(AccessProfile profile, long fetchedAt) {}

    private final ConcurrentHashMap<String, Entry> entries = new ConcurrentHashMap<>();
    private final long freshMs;
    private final long hardLimitMs;
    private final LongSupplier clock;

    AccessProfileCache(long freshMs, long hardLimitMs, LongSupplier clock) {
        this.freshMs = freshMs;
        this.hardLimitMs = hardLimitMs;
        this.clock = clock;
    }

    static String key(String orgId, String userId) {
        return orgId + ":" + userId;
    }

    Optional<AccessProfile> fresh(String key) {
        Entry entry = entries.get(key);
        if (entry == null) return Optional.empty();
        long age = clock.getAsLong() - entry.fetchedAt();
        return age <= freshMs ? Optional.of(entry.profile()) : Optional.empty();
    }

    Optional<AccessProfile> lastKnownGood(String key) {
        Entry entry = entries.get(key);
        if (entry == null) return Optional.empty();
        long age = clock.getAsLong() - entry.fetchedAt();
        if (age > hardLimitMs) {
            entries.remove(key, entry);
            return Optional.empty();
        }
        return Optional.of(entry.profile().withStale(true));
    }

    void put(String key, AccessProfile profile) {
        if (entries.size() >= MAX_ENTRIES) entries.clear();
        entries.put(key, new Entry(profile, clock.getAsLong()));
    }

    void clear() {
        entries.clear();
    }
}
