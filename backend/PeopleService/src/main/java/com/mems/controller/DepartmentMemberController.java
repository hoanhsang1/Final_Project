package com.mems.controller;
import com.mems.dto.*;
import com.mems.security.RequirePermission;
import com.mems.service.MemberService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/departments/{departmentId}/members")
public class DepartmentMemberController {
    private final MemberService service;
    public DepartmentMemberController(MemberService service) { this.service=service; }
    @GetMapping @RequirePermission(value="employee.view", department="departmentId")
    public List<MemberResponse> list(@PathVariable String departmentId) { return service.list(departmentId); }
    @GetMapping("/{userId}") @RequirePermission(value="employee.view", department="departmentId")
    public MemberDetailResponse detail(@PathVariable String departmentId,@PathVariable String userId) {
        return service.detail(departmentId,userId);
    }
    @GetMapping("/{userId}/assignments")
    @RequirePermission(value="employee.view", department="departmentId")
    public List<AssignmentHistoryResponse> assignments(@PathVariable String departmentId,
                                                       @PathVariable String userId) {
        return service.assignmentHistory(departmentId,userId);
    }
    @PostMapping @RequirePermission(value="employee.create", department="departmentId")
    public ResponseEntity<CreatedMemberResponse> create(@PathVariable String departmentId,@Valid @RequestBody MemberRequest request) {
        var result=service.create(departmentId,request);
        return ResponseEntity.created(java.net.URI.create("/departments/"+departmentId+"/members/"+result.member().userId())).body(result);
    }
    @PutMapping("/{userId}/positions")
    @RequirePermission(value="employee.assign_position", department="departmentId")
    public MemberResponse positions(@PathVariable String departmentId,@PathVariable String userId,
            @Valid @RequestBody MemberPositionsRequest request) { return service.updatePositions(departmentId,userId,request); }
    @PostMapping("/{userId}/reset-password")
    @RequirePermission(value="employee.reset_password", department="departmentId")
    public ResetPasswordResponse resetPassword(@PathVariable String departmentId,@PathVariable String userId) {
        return service.resetPassword(departmentId,userId);
    }
    @DeleteMapping("/{userId}") @RequirePermission(value="employee.delete", department="departmentId")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String departmentId,@PathVariable String userId) { service.remove(departmentId,userId); }
}
