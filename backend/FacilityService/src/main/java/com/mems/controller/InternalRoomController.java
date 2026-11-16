package com.mems.controller;

import com.mems.dto.InternalRoomResponse;
import com.mems.service.FacilityService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Nội bộ cho ScheduleService: trạng thái phòng và thiết bị hỏng. */
@RestController
@RequestMapping("/internal/rooms")
public class InternalRoomController {
    private final FacilityService facilities;

    public InternalRoomController(FacilityService facilities) {
        this.facilities = facilities;
    }

    @GetMapping
    public List<InternalRoomResponse> rooms(@RequestParam String orgId,
                                            @RequestParam String departmentId) {
        return facilities.internalRooms(orgId, departmentId);
    }

    @GetMapping("/{roomId}")
    public InternalRoomResponse room(@PathVariable String roomId, @RequestParam String orgId) {
        return facilities.internalRoom(orgId, roomId);
    }
}
