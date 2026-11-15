package com.mems.dto;

import java.time.LocalDate;

public record EquipmentResponse(String id, String assetCode, String name, String equipmentType,
                                String roomId, String roomName, String status, LocalDate purchaseDate) {}
