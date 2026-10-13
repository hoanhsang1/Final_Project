package com.mems.identity.repository;

import com.mems.identity.entity.ModuleConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ModuleConfigRepository extends JpaRepository<ModuleConfig, UUID> {

    // Dùng cho US 2-4: Frontend lấy TOÀN BỘ module (kèm true/false) sau khi đăng nhập
    List<ModuleConfig> findByOrganization_Id(UUID orgId);
}
