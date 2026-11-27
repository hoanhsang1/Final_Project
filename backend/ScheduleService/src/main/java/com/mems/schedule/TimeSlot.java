package com.mems.schedule;

import java.time.LocalTime;

/** Một tiết học của tổ chức. Giờ nghỉ không phải là tiết. */
public record TimeSlot(String id, int periodNo, String name, LocalTime start, LocalTime end,
                       boolean joinsNext, boolean active) {
}
