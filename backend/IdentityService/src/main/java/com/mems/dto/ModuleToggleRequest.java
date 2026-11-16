package com.mems.dto;

/**
 * Request body for OWNER toggling an Optional module on/off.
 * <p>{@code enabled = true} → activate; {@code enabled = false} → disable.</p>
 */
public record ModuleToggleRequest(Boolean enabled) {
    public boolean isEnabled() {
        return Boolean.TRUE.equals(enabled);
    }
}
