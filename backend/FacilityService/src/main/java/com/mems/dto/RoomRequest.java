package com.mems.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RoomRequest(@NotBlank @Size(max = 50) String code,
                          @NotBlank @Size(max = 200) String name,
                          @Size(max = 100) String building,
                          @Size(max = 20) String floor,
                          @Min(1) int capacity,
                          String roomType,
                          String status) {}
