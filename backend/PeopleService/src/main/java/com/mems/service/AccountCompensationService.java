package com.mems.service;
import com.mems.client.IdentityClient;
import org.slf4j.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.sql.Timestamp;
import java.time.Instant;

@Service
public class AccountCompensationService {
    private static final Logger log=LoggerFactory.getLogger(AccountCompensationService.class);
    private final JdbcTemplate jdbc;
    private final IdentityClient identity;
    private final TransactionTemplate tx;
    public AccountCompensationService(JdbcTemplate jdbc,IdentityClient identity,PlatformTransactionManager manager) {
        this.jdbc=jdbc;this.identity=identity;this.tx=new TransactionTemplate(manager);this.tx.setTimeout(15);
    }
    public void register(String id,String orgId) {
        tx.executeWithoutResult(status -> jdbc.update(
            "INSERT INTO account_compensation(user_id,org_id,created_at) VALUES (?,?,?)",id,orgId,Timestamp.from(Instant.now())));
    }
    // Call inside the same local transaction that saves the appointment.
    public void lock(String id) {
        if(jdbc.queryForList("SELECT user_id FROM account_compensation WHERE user_id=? FOR UPDATE",String.class,id).isEmpty())
            throw new IllegalStateException("Account provisioning was already cancelled");
    }
    public void complete(String id) { jdbc.update("DELETE FROM account_compensation WHERE user_id=?",id); }
    public void compensate(String id) {
        try {
            tx.executeWithoutResult(status -> {
                var rows=jdbc.queryForList("SELECT org_id FROM account_compensation WHERE user_id=? FOR UPDATE",String.class,id);
                if(rows.isEmpty()) return;
                identity.deleteAccount(id,rows.get(0));
                complete(id);
            });
        } catch(RuntimeException ex) {
            jdbc.update("UPDATE account_compensation SET attempts=attempts+1 WHERE user_id=?",id);
            log.error("Account compensation pending for userId={}; scheduled retry will continue",id);
        }
    }
    @Scheduled(fixedDelayString="${people.compensation-delay-ms:60000}")
    public void retry() {
        jdbc.queryForList("SELECT user_id FROM account_compensation WHERE created_at<? ORDER BY created_at LIMIT 100",
            String.class,Timestamp.from(Instant.now().minusSeconds(120))).forEach(this::compensate);
    }
}
