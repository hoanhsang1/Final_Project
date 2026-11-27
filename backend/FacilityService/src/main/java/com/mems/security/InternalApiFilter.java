package com.mems.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mems.dto.ApiError;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** Bảo vệ các endpoint /internal/** bằng khóa dịch vụ dùng chung. */
public class InternalApiFilter extends OncePerRequestFilter {
    private static final String API_KEY_HEADER = "X-Internal-Api-Key";

    private final String key;
    private final ObjectMapper mapper;

    public InternalApiFilter(String key, ObjectMapper mapper) {
        this.key = key;
        this.mapper = mapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !org.springframework.web.util.UrlPathHelper.defaultInstance
            .getPathWithinApplication(request).startsWith("/internal/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String supplied = request.getHeader(API_KEY_HEADER);
        if (key == null || key.length() < 32 || supplied == null || supplied.length() < 32
                || !MessageDigest.isEqual(key.getBytes(StandardCharsets.UTF_8),
                                          supplied.getBytes(StandardCharsets.UTF_8))) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            mapper.writeValue(response.getOutputStream(),
                new ApiError("UNAUTHENTICATED", "Service authentication required"));
            return;
        }
        chain.doFilter(request, response);
    }
}
