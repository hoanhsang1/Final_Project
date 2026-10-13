package com.mems.identity.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Sprint 1: tạm thời CHƯA gắn JWT filter thật (sẽ làm ở MEMS-34).
 * Đã mở sẵn các route /health và /auth/** để code các API đăng ký/đăng nhập
 * (MEMS-44, MEMS-34...) mà không bị Spring Security chặn mặc định (401 cho mọi route).
 * Khi làm xong JwtAuthFilter, thêm .addFilterBefore(...) vào đây rồi đổi
 * anyRequest().authenticated() áp dụng cho toàn bộ route còn lại.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        // Dùng cho MEMS-42 "Hash mật khẩu trước khi lưu" — KHÔNG tự viết hash thủ công
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // API thuần JSON, không dùng session/cookie form — tắt CSRF là hợp lý
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/health", "/auth/**").permitAll()
                .anyRequest().authenticated()
            );
        return http.build();
    }
}
