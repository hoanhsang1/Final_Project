package com.mems.schedule;

/** Quy tắc tiết của một lớp trong một thứ. off=true là khoảng không được xếp. */
public record ClassSlotRule(int weekday, int fromPeriod, int toPeriod, boolean off) {
}
