package com.mems.config;

import com.mems.service.RoleCatalog;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Startup guard: a fresh database missing a required role must fail fast (AUTH-06). */
class RoleCatalogValidatorTest {

    private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        jdbc = mock(JdbcTemplate.class);
    }

    @Test
    @DisplayName("passes when every required role is seeded")
    void passesWithCompleteCatalog() {
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString(), anyString())).thenReturn(1);

        assertThatCode(() -> new RoleCatalogValidator(jdbc).run(null)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("fails fast and names the missing role")
    void failsFastOnMissingRole() {
        for (String role : RoleCatalog.REQUIRED_ORGANIZATION_ROLES) {
            int count = "ORG_OWNER".equals(role) ? 0 : 1;
            when(jdbc.queryForObject(anyString(), eq(Integer.class), eq(role), eq("organization")))
                .thenReturn(count);
        }
        when(jdbc.queryForObject(anyString(), eq(Integer.class), eq(RoleCatalog.SUPER_ADMIN), eq("platform")))
            .thenReturn(1);

        assertThatThrownBy(() -> new RoleCatalogValidator(jdbc).run(null))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("ORG_OWNER");
    }
}
