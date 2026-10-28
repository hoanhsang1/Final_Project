package com.mems.security;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mems.dto.ApiError;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

public class InternalApiFilter extends OncePerRequestFilter {
    private final String key;
    private final ObjectMapper mapper;
    public InternalApiFilter(String key,ObjectMapper mapper) { this.key=key; this.mapper=mapper; }
    @Override protected boolean shouldNotFilter(HttpServletRequest request) {
        return !org.springframework.web.util.UrlPathHelper.defaultInstance
            .getPathWithinApplication(request).startsWith("/internal/");
    }
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)
            throws ServletException,IOException {
        String supplied=request.getHeader("X-Internal-Api-Key");
        if (key == null || key.length()<32 || supplied==null ||
                !MessageDigest.isEqual(key.getBytes(StandardCharsets.UTF_8),supplied.getBytes(StandardCharsets.UTF_8))) {
            response.setStatus(401); response.setContentType("application/json");
            mapper.writeValue(response.getOutputStream(),new ApiError("UNAUTHENTICATED","Service authentication required"));
            return;
        }
        chain.doFilter(request,response);
    }
}
