package com.mems.outbox;

/** Tên event chuẩn cho luồng Facility → Schedule (SCH-04). */
public final class OutboxEventTypes {
    public static final String FACILITY_INCIDENT_OPENED = "FacilityIncidentOpened";
    public static final String FACILITY_INCIDENT_RESOLVED = "FacilityIncidentResolved";

    private OutboxEventTypes() {}
}
