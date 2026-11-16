package com.mems.dto;

/**
 * Request body for SUPER_ADMIN locking or unlocking a module for an organization.
 * <p>{@code reason} is mandatory; {@code lock = true} locks, {@code false} unlocks.</p>
 */
public record ModuleLockRequest(Boolean lock, String reason) {
    public boolean isLock() {
        return Boolean.TRUE.equals(lock);
    }
}
