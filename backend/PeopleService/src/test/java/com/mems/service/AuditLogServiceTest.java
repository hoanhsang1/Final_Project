package com.mems.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mems.dto.AuditLogResponse;
import com.mems.repository.AuditLogRepository;
import com.mems.security.Actor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@JdbcTest
class AuditLogServiceTest {
    private static final String ORG = "audit-org-1";
    private static final String OTHER_ORG = "audit-org-2";
    private static final Instant BASE = Instant.parse("2026-11-20T10:00:00Z");

    @Autowired
    private JdbcTemplate jdbc;

    private ObjectMapper mapper;
    private AuditLogService service;

    @BeforeEach
    void setUp() {
        mapper = new ObjectMapper();
        Actor actor = mock(Actor.class);
        when(actor.orgId()).thenReturn(ORG);
        service = new AuditLogService(new AuditLogRepository(jdbc), actor, mapper);
        jdbc.update("DELETE FROM people_audit_log WHERE org_id IN (?,?)", ORG, OTHER_ORG);
        jdbc.update("DELETE FROM staff_profile WHERE org_id IN (?,?)", ORG, OTHER_ORG);
        jdbc.update("DELETE FROM department_member WHERE org_id IN (?,?)", ORG, OTHER_ORG);
        jdbc.update("DELETE FROM department WHERE org_id IN (?,?)", ORG, OTHER_ORG);
    }

    @Test
    @DisplayName("CC-06: chỉ trả nhật ký của tổ chức trong JWT")
    void returnsOnlyCurrentOrganizationEntries() {
        insertAudit("a1", ORG, "u1", "CLASS_CREATE", "class-1", "{}", BASE);
        insertAudit("a2", ORG, "u1", "CLASS_EDIT", "class-1", "{}", BASE);
        insertAudit("a3", OTHER_ORG, "u9", "CLASS_CREATE", "class-9", "{}", BASE);

        Map<String, Object> result = service.list(1, 20, null, null, null, null);

        assertThat(result.get("total")).isEqualTo(2L);
        @SuppressWarnings("unchecked")
        List<AuditLogResponse> items = (List<AuditLogResponse>) result.get("items");
        assertThat(items).extracting(AuditLogResponse::id).containsExactlyInAnyOrder("a1", "a2");
    }

    @Test
    @DisplayName("CC-06: phân trang ở DB và sắp xếp mới nhất trước")
    void paginatesNewestFirst() {
        insertAudit("a1", ORG, "u1", "CLASS_CREATE", "c", "{}", BASE.plusSeconds(10));
        insertAudit("a2", ORG, "u1", "CLASS_CREATE", "c", "{}", BASE.plusSeconds(20));
        insertAudit("a3", ORG, "u1", "CLASS_CREATE", "c", "{}", BASE.plusSeconds(30));
        insertAudit("a4", ORG, "u1", "CLASS_CREATE", "c", "{}", BASE.plusSeconds(40));
        insertAudit("a5", ORG, "u1", "CLASS_CREATE", "c", "{}", BASE.plusSeconds(50));

        Map<String, Object> firstPage = service.list(1, 2, null, null, null, null);
        Map<String, Object> secondPage = service.list(2, 2, null, null, null, null);

        assertThat(firstPage.get("total")).isEqualTo(5L);
        assertThat(firstPage.get("page")).isEqualTo(1);
        assertThat(firstPage.get("size")).isEqualTo(2);
        @SuppressWarnings("unchecked")
        List<AuditLogResponse> page1 = (List<AuditLogResponse>) firstPage.get("items");
        @SuppressWarnings("unchecked")
        List<AuditLogResponse> page2 = (List<AuditLogResponse>) secondPage.get("items");
        assertThat(page1).extracting(AuditLogResponse::id).containsExactly("a5", "a4");
        assertThat(page2).extracting(AuditLogResponse::id).containsExactly("a3", "a2");
    }

    @Test
    @DisplayName("CC-06: page/size bất thường được kẹp về giá trị hợp lệ")
    void clampsPageAndSize() {
        insertAudit("a1", ORG, "u1", "CLASS_CREATE", "c", "{}", BASE);

        Map<String, Object> result = service.list(0, 500, null, null, null, null);

        assertThat(result.get("page")).isEqualTo(1);
        assertThat(result.get("size")).isEqualTo(100);
    }

    @Test
    @DisplayName("CC-06: lọc theo action, actor và khoảng thời gian")
    void filtersByActionActorAndTimeRange() {
        insertAudit("a1", ORG, "u1", "CLASS_CREATE", "c", "{}", BASE);
        insertAudit("a2", ORG, "u1", "CLASS_EDIT", "c", "{}", BASE.plusSeconds(60));
        insertAudit("a3", ORG, "u2", "CLASS_CREATE", "c", "{}", BASE.plusSeconds(120));

        Map<String, Object> byAction = service.list(1, 20, "CLASS_CREATE", null, null, null);
        Map<String, Object> byActor = service.list(1, 20, null, "u2", null, null);
        Map<String, Object> byTime = service.list(1, 20, null, null,
            BASE.plusSeconds(30), BASE.plusSeconds(90));

        assertThat(ids(byAction)).containsExactlyInAnyOrder("a1", "a3");
        assertThat(ids(byActor)).containsExactly("a3");
        assertThat(ids(byTime)).containsExactly("a2");
    }

    @Test
    @DisplayName("CC-06: che password/token/secret/credential kể cả lồng nhau")
    void masksSensitiveFieldsRecursively() {
        insertAudit("a1", ORG, "u1", "ACCOUNT_CREATE", "acc-1",
            "{\"username\":\"an\",\"password\":\"p@ss\",\"accessToken\":\"jwt\","
                + "\"nested\":{\"clientSecret\":\"s\",\"keep\":\"v\"},"
                + "\"items\":[{\"credentialId\":\"c1\",\"note\":\"ok\"}]}", BASE);

        AuditLogResponse row = single(service.list(1, 20, null, null, null, null));
        JsonNode details = row.details();

        assertThat(details.get("username").asText()).isEqualTo("an");
        assertThat(details.get("password").asText()).isEqualTo("***");
        assertThat(details.get("accessToken").asText()).isEqualTo("***");
        assertThat(details.get("nested").get("clientSecret").asText()).isEqualTo("***");
        assertThat(details.get("nested").get("keep").asText()).isEqualTo("v");
        assertThat(details.get("items").get(0).get("credentialId").asText()).isEqualTo("***");
        assertThat(details.get("items").get(0).get("note").asText()).isEqualTo("ok");
    }

    @Test
    @DisplayName("CC-06: details không parse được JSON thì trả nhãn thay vì chuỗi thô")
    void replacesUnreadableDetails() {
        insertAudit("a1", ORG, "u1", "CLASS_CREATE", "c", "not-json-raw-secret", BASE);

        AuditLogResponse row = single(service.list(1, 20, null, null, null, null));

        assertThat(row.details().asText()).isEqualTo("[unreadable]");
    }

    @Test
    @DisplayName("CC-06: gắn tên người thao tác từ hồ sơ nhân sự")
    void joinsActorName() {
        jdbc.update("INSERT INTO department(id,org_id,name,created_at) VALUES (?,?,?,?)",
            "dept-1", ORG, "Phòng Đào tạo", Timestamp.from(BASE));
        jdbc.update("INSERT INTO department_member(user_id,org_id,department_id,role,appointed_by,appointed_at,status) "
                + "VALUES (?,?,?,?,?,?,?)",
            "u1", ORG, "dept-1", "EMPLOYEE", "owner-1", Timestamp.from(BASE), "ACTIVE");
        jdbc.update("INSERT INTO staff_profile(user_id,org_id,staff_code,full_name,full_name_unaccented,version,created_at) "
                + "VALUES (?,?,?,?,?,?,?)",
            "u1", ORG, "NV001", "Nguyễn Văn An", "Nguyen Van An", 0L, Timestamp.from(BASE));
        insertAudit("a1", ORG, "u1", "CLASS_CREATE", "c", "{}", BASE);

        AuditLogResponse row = single(service.list(1, 20, null, null, null, null));

        assertThat(row.actorName()).isEqualTo("Nguyễn Văn An");
    }

    @Test
    @DisplayName("CC-06: lỗi DB không bị nuốt thành danh sách rỗng")
    void propagatesDatabaseErrors() {
        AuditLogRepository broken = mock(AuditLogRepository.class);
        when(broken.count(anyString(), any(), any(), any(), any()))
            .thenThrow(new DataAccessResourceFailureException("db down"));
        Actor actor = mock(Actor.class);
        when(actor.orgId()).thenReturn(ORG);
        AuditLogService failing = new AuditLogService(broken, actor, mapper);

        assertThatThrownBy(() -> failing.list(1, 20, null, null, null, null))
            .isInstanceOf(DataAccessResourceFailureException.class);
    }

    private void insertAudit(String id, String orgId, String actorUserId, String action,
                             String targetId, String details, Instant createdAt) {
        jdbc.update("INSERT INTO people_audit_log(id,org_id,actor_user_id,action,target_id,details,created_at) "
                + "VALUES (?,?,?,?,?,?,?)",
            id, orgId, actorUserId, action, targetId, details, Timestamp.from(createdAt));
    }

    @SuppressWarnings("unchecked")
    private List<String> ids(Map<String, Object> result) {
        return ((List<AuditLogResponse>) result.get("items")).stream()
            .map(AuditLogResponse::id).toList();
    }

    @SuppressWarnings("unchecked")
    private AuditLogResponse single(Map<String, Object> result) {
        List<AuditLogResponse> items = (List<AuditLogResponse>) result.get("items");
        assertThat(items).hasSize(1);
        return items.get(0);
    }
}
