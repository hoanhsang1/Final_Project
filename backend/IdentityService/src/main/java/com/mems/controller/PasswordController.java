package com.mems.controller;
import com.mems.dto.ChangePasswordRequest;
import com.mems.service.PasswordChangeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class PasswordController {
    private final PasswordChangeService service;
    public PasswordController(PasswordChangeService service) { this.service=service; }
    @PostMapping("/change-password") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void change(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody ChangePasswordRequest request) {
        service.change(jwt.getSubject(),request);
    }
}
