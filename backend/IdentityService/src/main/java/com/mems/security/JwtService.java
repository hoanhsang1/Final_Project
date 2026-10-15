package com.mems.security;


import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.stereotype.Service;

import javax.crypto.spec.SecretKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.List;

@Service 
public class JwtService {
    private static final long ACCESS_TOKEN_SECONDS = 900;
    private final JwtEncoder jwtEncoder;

    public JwtService (
        @Value("${jwt.secret-base64}") String secretBase64
    ) {
        byte[] serect = Base64.getDecoder().decode(secretBase64);

        if (serect.length < 32) {
            throw new IllegalArgumentException(
                "JWT secret must contain at least 32 bytes"
            );
        }

        SecretKeySpec key = new SecretKeySpec(serect, "HmacSHA256");

        this.jwtEncoder = new NimbusJwtEncoder(
            new ImmutableSecret<>(key)
        );
    }

    public String generateAccessToken(
        String userId,
        String username,
        String orgId,
        List<String> roles
    ) {
        Instant now = Instant.now();

        JwtClaimsSet.Builder claimsBuilder = JwtClaimsSet.builder()
                .issuer("mems-identity")
                .subject(userId)
                .issuedAt(now)
                .expiresAt(now.plusSeconds(ACCESS_TOKEN_SECONDS))
                .claim("userId", userId)
                .claim("username", username)
                .claim("roles", roles);

        // Chi them orgId voi tai khoan thuoc to chuc
        if (orgId != null) {
            claimsBuilder.claim("orgId", orgId);
        }

        JwtClaimsSet claims = claimsBuilder.build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();

        return jwtEncoder.encode(
            JwtEncoderParameters.from(header, claims)
        ).getTokenValue();
    }
}
