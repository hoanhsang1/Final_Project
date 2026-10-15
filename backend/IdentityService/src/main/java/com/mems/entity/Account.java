package com.mems.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Entity
@Table(name="account")
public class Account {
    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "org_id", length = 36)
    private String orgId;

    @Column(name = "username", nullable = false)
    private String username;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "last_login_at", nullable =false)
    private LocalDateTime lastLoginAt;

    public void setLastLoginAt(LocalDateTime lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }
}
