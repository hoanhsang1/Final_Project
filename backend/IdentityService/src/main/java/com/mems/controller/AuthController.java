package com.mems.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mems.dto.ApiResponse;
import com.mems.dto.LoginRequest;
import com.mems.dto.LoginResponse;
import com.mems.dto.LogoutRequest;
import com.mems.dto.RefreshTokenRequest;
import com.mems.service.impl.IAuthService;
import com.mems.dto.RegisterOrganizationRequest;
import com.mems.service.OrganizationRegistrationService;
import java.util.Map;

import jakarta.validation.Valid;

import org.apache.hc.core5.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;



@RestController 
@RequestMapping ("/api/v1/auth")
public class AuthController {
    
    @Autowired 
    private IAuthService authService;

    @Autowired
    private OrganizationRegistrationService registrationService;

    @GetMapping("/test")
    public ResponseEntity<ApiResponse<Void>> getMethodName() {
        return ResponseEntity.ok(ApiResponse.success("Identity Service is running", null));
    }
    

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
        @Valid @RequestBody LoginRequest request
    ) {
        return ResponseEntity.ok(authService.login(request));
    }
    
    
    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refreshToken(
            @Valid @RequestBody RefreshTokenRequest request
    ) {
        return ResponseEntity.ok(
                authService.refresh(request)
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @Valid @RequestBody LogoutRequest request
    ) {
        authService.logout(request);

        return ResponseEntity.noContent().build();
    }

    
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(
            @Valid @RequestBody RegisterOrganizationRequest request
    ) {
        Map<String, Object> result = registrationService.register(request);

        return ResponseEntity
                .status(org.springframework.http.HttpStatus.CREATED)
                .body(result);
    }

    
}
