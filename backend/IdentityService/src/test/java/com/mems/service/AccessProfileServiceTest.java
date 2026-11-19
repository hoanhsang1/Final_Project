package com.mems.service;

import com.mems.client.PeopleAuthorizationClient;
import com.mems.dto.AccessProfile;
import com.mems.entity.Account;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AccessProfileServiceTest {

    private PeopleAuthorizationClient people;
    private JdbcTemplate jdbc;
    private Account account;
    private AccessProfileService service;

    @BeforeEach
    void setUp() {
        people = mock(PeopleAuthorizationClient.class);
        jdbc = mock(JdbcTemplate.class);
        account = mock(Account.class);
        when(account.getId()).thenReturn("user-1");
        when(account.getOrgId()).thenReturn("org-1");
        service = new AccessProfileService(people, jdbc);
    }

    @Test
    @DisplayName("OWNER nhận toàn bộ danh mục quyền, không đi qua People")
    void ownerGetsFullCatalog() {
        AccessProfile profile = service.resolve(account, List.of("OWNER"));

        assertThat(profile.role()).isEqualTo("OWNER");
        assertThat(profile.isStale()).isFalse();
        assertThat(profile.permissions())
            .containsExactlyInAnyOrderElementsOf(PermissionCatalog.ENTRIES.stream()
                .map(PermissionCatalog.PermissionDefinition::code).toList());
    }

    @Test
    @DisplayName("MANAGER/STAFF nhận hồ sơ từ People và giữ cờ stale")
    void employeeComesFromPeople() {
        AccessProfile stale = new AccessProfile("MANAGER", null, Set.of(), java.util.Map.of(),
            Set.of(), true);
        when(people.resolve("user-1", "org-1", "MANAGER")).thenReturn(stale);

        AccessProfile profile = service.resolve(account, List.of("MANAGER"));

        assertThat(profile).isSameAs(stale);
        assertThat(profile.isStale()).isTrue();
    }

    @Test
    @DisplayName("STUDENT luôn có quyền SELF dù role_permission thiếu")
    void studentAlwaysHasSelfPermissions() {
        when(jdbc.queryForList(anyString(), eq(String.class), eq("user-1")))
            .thenReturn(List.of());

        AccessProfile profile = service.resolve(account, List.of("STUDENT"));

        assertThat(profile.role()).isEqualTo("STUDENT");
        assertThat(profile.permissions())
            .containsExactlyInAnyOrder("student.self_view", "class.self_view", "schedule.self_view");
    }
}
