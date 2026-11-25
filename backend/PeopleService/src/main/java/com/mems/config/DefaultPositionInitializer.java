package com.mems.config;

import com.mems.service.DefaultPositionSeeder;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/** Backfills default positions for organizations that already exist when the service starts. */
@Component
public class DefaultPositionInitializer implements ApplicationRunner {
    private final DefaultPositionSeeder seeder;

    public DefaultPositionInitializer(DefaultPositionSeeder seeder) {
        this.seeder = seeder;
    }

    @Override
    public void run(ApplicationArguments args) {
        seeder.ensureForAllOrganizations();
    }
}
