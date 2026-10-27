package com.mems.security;
import com.mems.dto.AccessProfile;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import javax.crypto.spec.SecretKeySpec;
import java.time.Instant;
import java.util.*;

@Service
public class JwtService {
    private final JwtEncoder jwtEncoder;
    private final long accessTokenSeconds;
    public JwtService(@Value("${jwt.secret-base64}") String secretBase64,
            @Value("${jwt.access-token-seconds:900}") long accessTokenSeconds) {
        byte[] secret=Base64.getDecoder().decode(secretBase64);
        if(secret.length<32) throw new IllegalArgumentException("JWT secret must contain at least 32 bytes");
        if(accessTokenSeconds<60 || accessTokenSeconds>900) throw new IllegalArgumentException("Access token lifetime must be 60 to 900 seconds");
        this.accessTokenSeconds=accessTokenSeconds;
        this.jwtEncoder=new NimbusJwtEncoder(new ImmutableSecret<>(new SecretKeySpec(secret,"HmacSHA256")));
    }
    public long accessTokenSeconds() { return accessTokenSeconds; }
    public String generateAccessToken(String userId,String username,String orgId,List<String> roles,
            AccessProfile profile,boolean mustChangePassword) {
        Instant now=Instant.now();
        Set<String> effectiveRoles=new LinkedHashSet<>(roles);
        effectiveRoles.remove("MANAGER");effectiveRoles.remove("STAFF");effectiveRoles.add(profile.role());
        var builder=JwtClaimsSet.builder().issuer("mems-identity").subject(userId).issuedAt(now)
            .expiresAt(now.plusSeconds(accessTokenSeconds)).claim("userId",userId).claim("username",username)
            .claim("roles",new ArrayList<>(effectiveRoles)).claim("role",profile.role())
            .claim("permissions",new TreeSet<>(profile.permissions())).claim("mustChangePassword",mustChangePassword)
            .claims(claims -> claims.put("departmentId",profile.departmentId()));
        if(orgId!=null) builder.claim("orgId",orgId);
        return jwtEncoder.encode(JwtEncoderParameters.from(
            JwsHeader.with(MacAlgorithm.HS256).build(),builder.build())).getTokenValue();
    }
}
