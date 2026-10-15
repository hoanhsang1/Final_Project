package com.mems;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class GeneratePasswordHash {

    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

        String password = System.getenv("ADMIN_BOOTSTRAP_PASSWORD");

        if (password == null || password.isBlank()) {
            throw new IllegalStateException(
                "ADMIN_BOOTSTRAP_PASSWORD is required"
            );
        }

        System.out.println(encoder.encode(password));
    }
}