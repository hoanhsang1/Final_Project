package com.mems.exception;

import org.springframework.http.HttpStatus;

import lombok.Getter;

@Getter 
public class ApiException extends RuntimeException{
    private final HttpStatus status;

    public ApiException(HttpStatus status, String mess) {
        super(mess);
        this.status = status;
    }
}
