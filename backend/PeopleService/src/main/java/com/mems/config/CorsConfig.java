package com.mems.config;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
import org.springframework.web.cors.*;
import java.util.*;

@Configuration
public class CorsConfig {
    @Bean CorsConfigurationSource corsConfigurationSource(Environment env) {
        var config=new CorsConfiguration();
        config.setAllowedOrigins(Arrays.stream(env.getProperty("CORS_ALLOWED_ORIGINS","http://localhost:5173").split(","))
            .map(String::trim).filter(s -> !s.isBlank()).toList());
        config.setAllowedMethods(List.of("GET","POST","PUT","DELETE","PATCH","OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization","Content-Type"));
        config.setAllowCredentials(false);config.setMaxAge(3600L);
        var source=new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**",config);
        return source;
    }
}
