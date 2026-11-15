package com.mems.client;

/** Lớp của học sinh từ PeopleService `GET /internal/students/{id}/classes`. */
public record StudentClass(String id, String classCode, String name, String status) {}
