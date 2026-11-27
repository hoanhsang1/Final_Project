package com.mems.dto;

import java.util.List;

public record TeacherAvailabilityResponse(String teacherId, List<TeacherAvailabilityDto> entries) {
}
