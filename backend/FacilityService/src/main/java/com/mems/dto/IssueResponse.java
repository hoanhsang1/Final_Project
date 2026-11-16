package com.mems.dto;

import java.time.Instant;

public record IssueResponse(String id, String equipmentId, String equipmentName, String reportedBy,
                            String description, String photoUrl, String status,
                            Instant resolvedAt, Instant createdAt) {}
