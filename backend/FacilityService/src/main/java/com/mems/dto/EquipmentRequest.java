package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record EquipmentRequest(@NotBlank @Size(max = 50) String assetCode,
                               @NotBlank @Size(max = 200) String name,
                               @Size(max = 100) String equipmentType,
                               String roomId,
                               String status,
                               LocalDate purchaseDate) {}
