package com.mems.dto;

public record RoomResponse(String id, String code, String name, String building, String floor,
                           int capacity, String roomType, String status) {}
