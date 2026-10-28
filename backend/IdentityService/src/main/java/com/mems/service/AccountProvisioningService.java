package com.mems.service;
import com.mems.dto.ProvisionAccountRequest;
import com.mems.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Map;

@Service
public class AccountProvisioningService {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    public AccountProvisioningService(JdbcTemplate jdbc,PasswordEncoder encoder) { this.jdbc=jdbc;this.encoder=encoder; }
    @Transactional(timeout=15)
    public Map<String,String> create(ProvisionAccountRequest request) {
        Integer organizations=jdbc.queryForObject("SELECT COUNT(*) FROM organization WHERE id=? AND status='active'",
            Integer.class,request.orgId());
        if(organizations==null || organizations!=1)
            throw new ApiException(HttpStatus.CONFLICT,"Organization is not active");
        Integer existing=jdbc.queryForObject("SELECT COUNT(*) FROM account WHERE username=? OR id=?",
            Integer.class,request.username(),request.userId());
        if(existing!=null && existing>0) throw new ApiException(HttpStatus.CONFLICT,"Account already exists");
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
    public void compensate(String id,String orgId) {
        var rows=jdbc.queryForList("SELECT provisioned_by,last_login_at FROM account WHERE id=? AND org_id=? FOR UPDATE",id,orgId);
        if(rows.isEmpty()) return;
        var row=rows.get(0);
        if(row.get("provisioned_by")==null || row.get("last_login_at")!=null)
            throw new ApiException(HttpStatus.CONFLICT,"Only unused provisioned accounts may be rolled back");
        jdbc.update("DELETE FROM account_role WHERE account_id=?",id);
        jdbc.update("DELETE FROM account WHERE id=? AND org_id=?",id,orgId);
    }
}
