package com.mems.service;

import com.mems.client.IdentityClient;
import com.mems.dto.DepartmentResponse;
import com.mems.repository.DepartmentRepository;
import com.mems.repository.PositionRepository;
import com.mems.security.Actor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class DepartmentServiceTest {

    private static final String ORG = "org-1";

    private DepartmentRepository repository;
    private Actor actor;
    private DepartmentService service;

    @BeforeEach
    void setUp() {
        repository = mock(DepartmentRepository.class);
        actor = mock(Actor.class);
        service = new DepartmentService(repository, mock(PositionRepository.class), actor,
            mock(IdentityClient.class), mock(PeopleAuditService.class), mock(DefaultPositionSeeder.class));
        when(actor.orgId()).thenReturn(ORG);
    }

    @Test
    @DisplayName("Transfer targets list the whole organization without department.view")
    void transferTargetsAreOrgWide() {
        var departments = List.of(new DepartmentResponse(
            "dept-1", "Tổ Toán – Tin", null, Instant.now(), List.of()));
        when(repository.list(ORG, null, true)).thenReturn(departments);

        var result = service.transferTargets();

        assertThat(result).isEqualTo(departments);
        verify(repository).list(ORG, null, true);
        verify(actor, never()).requirePermissionIn(anyString(), anyString());
        verify(actor, never()).requirePermission(anyString());
    }
}
