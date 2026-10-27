package com.mems.controller;
import com.mems.dto.*;
import com.mems.service.MemberService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/departments/{departmentId}/members")
public class DepartmentMemberController {
    private final MemberService service;
    public DepartmentMemberController(MemberService service) { this.service=service; }
    @GetMapping @PreAuthorize("hasRole('OWNER') or hasAuthority('PEOPLE_VIEW')")
    public List<MemberResponse> list(@PathVariable String departmentId) { return service.list(departmentId); }
    @PostMapping @PreAuthorize("hasRole('OWNER') or (hasRole('MANAGER') and hasAuthority('PEOPLE_EDIT'))")
    public ResponseEntity<CreatedMemberResponse> create(@PathVariable String departmentId,@Valid @RequestBody MemberRequest request) {
        var result=service.create(departmentId,request);
        return ResponseEntity.created(java.net.URI.create("/departments/"+departmentId+"/members/"+result.member().userId())).body(result);
    }
    @PutMapping("/{userId}/positions") @PreAuthorize("hasRole('OWNER') or (hasRole('MANAGER') and hasAuthority('PEOPLE_EDIT'))")
    public MemberResponse positions(@PathVariable String departmentId,@PathVariable String userId,
            @Valid @RequestBody MemberPositionsRequest request) { return service.updatePositions(departmentId,userId,request); }
    @DeleteMapping("/{userId}") @PreAuthorize("hasRole('OWNER') or (hasRole('MANAGER') and hasAuthority('PEOPLE_EDIT'))")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String departmentId,@PathVariable String userId) { service.remove(departmentId,userId); }
}
