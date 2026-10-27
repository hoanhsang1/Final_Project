package com.mems.security;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mems.dto.ApiError;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.SecurityFilterChain;
import javax.crypto.spec.SecretKeySpec;
import java.util.*;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    @Bean SecurityFilterChain securityFilterChain(HttpSecurity http, ObjectMapper mapper, @Value("${INTERNAL_API_KEY:}") String internalKey) throws Exception {
        http.cors(org.springframework.security.config.Customizer.withDefaults())
            .csrf(c -> c.disable())
            .addFilterBefore(new InternalApiFilter(internalKey,mapper),
                org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter.class)
            .addFilterAfter(new PasswordChangeRequiredFilter(mapper,Set.of()),
                org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter.class)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers("/internal/**").permitAll()
                .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(jwt -> {
                Set<SimpleGrantedAuthority> authorities = new HashSet<>();
                List<String> roles = jwt.getClaimAsStringList("roles");
                if (roles != null) roles.forEach(role ->
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + ("ORG_OWNER".equals(role) ? "OWNER" : role))));
                String role = jwt.getClaimAsString("role");
                if (role != null) authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
                List<String> permissions = jwt.getClaimAsStringList("permissions");
                if (permissions != null) permissions.forEach(p -> authorities.add(new SimpleGrantedAuthority(p)));
                return new JwtAuthenticationToken(jwt, authorities);
            })).authenticationEntryPoint((req,res,ex) -> {
                res.setStatus(401); res.setContentType("application/json");
                mapper.writeValue(res.getOutputStream(), new ApiError("UNAUTHENTICATED", "Valid Bearer token required"));
            }))
            .exceptionHandling(e -> e.accessDeniedHandler((req,res,ex) -> {
                res.setStatus(403); res.setContentType("application/json");
                mapper.writeValue(res.getOutputStream(), new ApiError("FORBIDDEN", "Access denied"));
            }));
        return http.build();
    }
    @Bean JwtDecoder jwtDecoder(@Value("${jwt.secret-base64}") String secretBase64) {
        byte[] secret = Base64.getDecoder().decode(secretBase64);
        if (secret.length < 32) throw new IllegalArgumentException("JWT secret must contain at least 32 bytes");
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(new SecretKeySpec(secret,"HmacSHA256"))
            .macAlgorithm(MacAlgorithm.HS256).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer("mems-identity"));
        return decoder;
    }
}
