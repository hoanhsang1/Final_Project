package com.mems.controller;

import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.lang.reflect.Method;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * GET /api/v1/modules/status là endpoint bị 404 lặp lại trên bản triển khai cũ.
 * Test khoá lại đường dẫn ở mức annotation để lần sau đổi tên là fail ngay.
 */
class ModuleEndpointMappingTest {

    @Test
    void moduleStatusPathIsStable() {
        RequestMapping classMapping = ModuleController.class.getAnnotation(RequestMapping.class);
        assertThat(classMapping).isNotNull();
        assertThat(Arrays.asList(classMapping.value())).containsExactly("/api/v1/modules");

        Method status = Arrays.stream(ModuleController.class.getDeclaredMethods())
            .filter(m -> m.isAnnotationPresent(GetMapping.class))
            .filter(m -> Arrays.asList(m.getAnnotation(GetMapping.class).value()).contains("/status"))
            .findFirst()
            .orElseThrow(() -> new AssertionError("ModuleController thiếu GET /status"));

        assertThat(status.getName()).isEqualTo("status");
    }
}
