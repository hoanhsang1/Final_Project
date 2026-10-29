package com.mems.client;
import com.mems.dto.AccessProfile;
import com.mems.exception.ApiException;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.*;
import java.time.Duration;

@Component
public class PeopleAuthorizationClient {
    private final RestTemplate http;
    public PeopleAuthorizationClient(RestTemplateBuilder builder,Environment env) {
        http=builder.rootUri(env.getProperty("PEOPLE_SERVICE_URL","http://localhost:8082"))
            .defaultHeader("X-Internal-Api-Key",env.getProperty("INTERNAL_API_KEY",""))
            .setConnectTimeout(Duration.ofSeconds(3)).setReadTimeout(Duration.ofSeconds(5)).build();
    }
    public AccessProfile resolve(String userId,String orgId) {
        try {
            var profile=http.getForObject("/internal/users/{id}/authorization?orgId={orgId}",AccessProfile.class,userId,orgId);
            if(profile==null || profile.permissions()==null ||
                    !java.util.Set.of("MANAGER","STAFF").contains(profile.role()))
                throw new IllegalStateException("Invalid authorization response");
            return profile;
        } catch(RestClientException | IllegalStateException ex) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"Department permissions are temporarily unavailable");
        }
    }
}
