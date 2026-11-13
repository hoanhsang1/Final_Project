package com.mems.security;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
class PermissionProbeController {
    @GetMapping("/test/class-assignment")
    @PreAuthorize("hasRole('OWNER') or hasAuthority('CLASS_ASSIGN_TEACHER')")
    String assign() {
        return "ok";
    }
}
