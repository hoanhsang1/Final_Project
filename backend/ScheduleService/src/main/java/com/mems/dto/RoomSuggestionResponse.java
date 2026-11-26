package com.mems.dto;

public record RoomSuggestionResponse(String id, String code, String name, int capacity,
                                     String status, String roomType) {}
