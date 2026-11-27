package com.mems.schedule;

import java.time.Instant;

/** Khoảng thời gian tuyệt đối của một buổi học sau khi quy đổi theo múi giờ nghiệp vụ. */
public record TimeRange(Instant start, Instant end) {
}
