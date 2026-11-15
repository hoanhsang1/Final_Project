package com.mems.config;

import com.mems.security.DelegationUsageInterceptor;
import com.mems.security.PermissionInterceptor;
import com.mems.service.PeopleAuditService;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Đăng ký kiểm tra {@code @RequirePermission} cho mọi controller. */
@Configuration
public class PermissionWebConfig implements WebMvcConfigurer {
    private final ObjectProvider<PeopleAuditService> audit;

    public PermissionWebConfig(ObjectProvider<PeopleAuditService> audit) {
        this.audit = audit;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new PermissionInterceptor());
        // Slice test (WebMvcTest) không có JdbcTemplate nên không có audit service.
        PeopleAuditService service = audit.getIfAvailable();
        if (service != null) registry.addInterceptor(new DelegationUsageInterceptor(service));
    }
}
