package com.mems.config;

import io.swagger.v3.oas.models.*;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.*;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.*;
import java.util.List;

@Configuration
public class OpenApiConfig {
    @Bean OpenAPI openAPI() {
        return new OpenAPI().info(new Info().title("MEMS PeopleService API").version("1.0"))
            .components(new Components().addSecuritySchemes("bearerAuth",
                new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
            .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
    @Bean OpenApiCustomizer publicOperations() {
        return api -> {
            if (api.getPaths() == null) return;
            api.getPaths().keySet().removeIf(path -> path.startsWith("/internal/"));
            for (String path : List.of("/api/v1/auth/login", "/api/v1/auth/register",
                    "/api/v1/auth/refresh", "/api/v1/auth/logout", "/api/v1/auth/test", "/api/v1/modules")) {
                var item = api.getPaths().get(path);
                if (item != null) item.readOperations().forEach(operation -> operation.setSecurity(List.of()));
            }
        };
    }
}

