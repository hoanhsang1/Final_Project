package com.mems.security;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mems.dto.ApiError;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.Set;

public class PasswordChangeRequiredFilter extends OncePerRequestFilter {
    private final ObjectMapper mapper;
    private final Set<String> allowed;
    public PasswordChangeRequiredFilter(ObjectMapper mapper,Set<String> allowed) { this.mapper=mapper;this.allowed=allowed; }
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)
            throws ServletException,IOException {
        var authentication=SecurityContextHolder.getContext().getAuthentication();
        if(authentication!=null && authentication.getPrincipal() instanceof Jwt jwt
                && Boolean.TRUE.equals(jwt.getClaimAsBoolean("mustChangePassword"))
                && !allowed.contains(org.springframework.web.util.UrlPathHelper.defaultInstance.getPathWithinApplication(request))) {
            response.setStatus(403);response.setContentType("application/json");
            mapper.writeValue(response.getOutputStream(),new ApiError("PASSWORD_CHANGE_REQUIRED","Change your temporary password first"));
            return;
        }
        chain.doFilter(request,response);
    }
}
