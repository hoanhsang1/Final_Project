package com.mems.service;
import com.mems.dto.ChangePasswordRequest;
import com.mems.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;

@Service
public class PasswordChangeService {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    public PasswordChangeService(JdbcTemplate jdbc,PasswordEncoder encoder) { this.jdbc=jdbc;this.encoder=encoder; }
    @Transactional
    public void change(String userId,ChangePasswordRequest request) {
        var hashes=jdbc.queryForList("SELECT password_hash FROM account WHERE id=? AND status='active' FOR UPDATE",String.class,userId);
        if(hashes.isEmpty() || !encoder.matches(request.currentPassword(),hashes.get(0)))
            throw new ApiException(HttpStatus.BAD_REQUEST,"Current password is incorrect");
        if(request.newPassword().getBytes(StandardCharsets.UTF_8).length>72 ||
                encoder.matches(request.newPassword(),hashes.get(0)))
            throw new ApiException(HttpStatus.BAD_REQUEST,"Choose a different password, at most 72 UTF-8 bytes");
        jdbc.update("UPDATE account SET password_hash=?,must_change_password=FALSE WHERE id=?",
            encoder.encode(request.newPassword()),userId);
        jdbc.update("UPDATE refresh_token SET revoked_at=? WHERE account_id=? AND revoked_at IS NULL",
            Timestamp.from(Instant.now()),userId);
    }
}
