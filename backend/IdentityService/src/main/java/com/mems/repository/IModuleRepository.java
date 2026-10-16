package com.mems.repository;

import com.mems.entity.Module;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IModuleRepository
        extends JpaRepository<Module, String> {

    boolean existsByCodeAndActiveTrue(String code);
}