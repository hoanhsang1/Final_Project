package com.mems.service;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

@Service
public class PeopleAuditService {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    public PeopleAuditService(JdbcTemplate jdbc,ObjectMapper mapper) { this.jdbc=jdbc;this.mapper=mapper; }
    public void record(String orgId,String actorId,String action,String targetId,Object details) {
        try {
            jdbc.update("INSERT INTO people_audit_log(id,org_id,actor_user_id,action,target_id,details,created_at) VALUES (?,?,?,?,?,?,?)",
                UUID.randomUUID().toString(),orgId,actorId,action,targetId,mapper.writeValueAsString(details),Timestamp.from(Instant.now()));
        } catch(JsonProcessingException ex) { throw new IllegalStateException("Cannot serialize audit entry",ex); }
    }
}
