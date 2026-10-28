package com.mems.controller;
import com.mems.dto.AuthorizationResponse;
import com.mems.repository.MemberRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/users")
public class InternalAuthorizationController {
    private final MemberRepository members;
    public InternalAuthorizationController(MemberRepository members) { this.members=members; }
    @GetMapping("/{userId}/authorization") @Transactional(readOnly=true)
    public AuthorizationResponse authorization(@PathVariable String userId,@RequestParam String orgId) {
        return members.authorization(userId,orgId);
    }
}
