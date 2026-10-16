package com.mems.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter @Setter 
@Entity
@Table(name = "refresh_token")
public class RefreshToken {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "account_id", nullable = false)
    private String accountId;

    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;

    @Column(name = "issued_at", nullable = false)
    private LocalDateTime issuedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @Column(name = "replaced_by", length = 36)
    private String replacedBy;

    protected RefreshToken() {
    }

    public RefreshToken(
            String id,
            String accountId,
            String tokenHash,
            LocalDateTime issuedAt,
            LocalDateTime expiresAt
    ) {
        this.id = id;
        this.accountId = accountId;
        this.tokenHash = tokenHash;
        this.issuedAt = issuedAt;
        this.expiresAt = expiresAt;
    }
}