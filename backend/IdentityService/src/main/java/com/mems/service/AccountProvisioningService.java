package com.mems.service;
import com.mems.dto.ProvisionAccountRequest;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;

@Service
public class AccountProvisioningService {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    private final SecureRandom random=new SecureRandom();
    public AccountProvisioningService(JdbcTemplate jdbc,PasswordEncoder encoder) { this.jdbc=jdbc;this.encoder=encoder; }
    @Transactional(timeout=15)
    public Map<String,String> create(ProvisionAccountRequest request) {
        Integer organizations=jdbc.queryForObject("SELECT COUNT(*) FROM organization WHERE id=? AND status='active'",
            Integer.class,request.orgId());
        if(organizations==null || organizations!=1)
            throw new AppException(ErrorCode.ORGANIZATION_INACTIVE, HttpStatus.CONFLICT);
        Integer existing=jdbc.queryForObject("SELECT COUNT(*) FROM account WHERE username=? OR id=?",
            Integer.class,request.username(),request.userId());
        if(existing!=null && existing>0) throw new AppException(ErrorCode.ACCOUNT_EXISTS);
        jdbc.update("""
            INSERT INTO account(id,org_id,username,email,password_hash,status,must_change_password,provisioned_by)
            VALUES (?,?,?,?,?,'active',TRUE,?)
            """,request.userId(),request.orgId(),request.username().trim(),request.email().trim(),
            encoder.encode(request.temporaryPassword()),request.appointedBy());
        int assigned=jdbc.update("INSERT INTO account_role(account_id,role_id) SELECT ?,id FROM role WHERE code=?",
            request.userId(),request.role());
        if(assigned!=1) throw new IllegalStateException("Department roles have not been seeded");
        return Map.of("userId",request.userId());
    }
    @Transactional
    public Map<String,String> resetPassword(String id,String orgId) {
        byte[] bytes=new byte[24];random.nextBytes(bytes);
        String password=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        int updated=jdbc.update("UPDATE account SET password_hash=?,must_change_password=TRUE WHERE id=? AND org_id=?",
            encoder.encode(password),id,orgId);
        if(updated!=1) throw new AppException(ErrorCode.ACCOUNT_NOT_FOUND);
        return Map.of("temporaryPassword",password);
    }
    @Transactional
    public void disable(String id,String orgId) {
        jdbc.update("UPDATE account SET status='disabled' WHERE id=? AND org_id=?",id,orgId);
    }

    @Transactional
    public void compensate(String id,String orgId) {
        var rows=jdbc.queryForList("SELECT provisioned_by,last_login_at FROM account WHERE id=? AND org_id=? FOR UPDATE",id,orgId);
        if(rows.isEmpty()) return;
        var row=rows.get(0);
        if(row.get("provisioned_by")==null || row.get("last_login_at")!=null)
            throw new AppException(ErrorCode.PROVISION_ROLLBACK_NOT_ALLOWED);
        jdbc.update("DELETE FROM account_role WHERE account_id=?",id);
        jdbc.update("DELETE FROM account WHERE id=? AND org_id=?",id,orgId);
    }
}
