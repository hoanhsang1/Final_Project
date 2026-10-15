package com.mems.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {

        http
            // API sử dụng Bearer Token, không sử dụng HTTP session
            .sessionManagement(session ->
                session.sessionCreationPolicy(
                    SessionCreationPolicy.STATELESS
                )
            )

            // Tạm thời tắt CSRF cho REST API sử dụng Bearer Token
            .csrf(csrf -> csrf.disable())

            // Cấu hình quyền truy cập endpoint
            .authorizeHttpRequests(auth -> auth

                // Cho phép Login mà không cần xác thực
                .requestMatchers(
                    HttpMethod.POST,
                    "/api/v1/auth/login",
                    "/api/v1/auth/refresh",
                    "/api/v1/auth/logout"
                ).permitAll()

                // Test sử dụng GET
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/v1/auth/test"
                ).permitAll()

                // Các endpoint còn lại cần xác thực
                .anyRequest().authenticated()
            );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}