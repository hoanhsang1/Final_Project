package com.mems.controller;

import com.mems.dto.SubjectResponse;
import com.mems.repository.SubjectRepository;
import com.mems.security.Actor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/subjects")
public class SubjectController {
    private final SubjectRepository subjects;
    private final Actor actor;

    public SubjectController(SubjectRepository subjects, Actor actor) {
        this.subjects = subjects;
        this.actor = actor;
    }

    @GetMapping
    @PreAuthorize("hasRole('OWNER') or hasAnyAuthority('class.view','student.view','class.assign_teacher','class.teacher.reassign')")
    public List<SubjectResponse> list(@RequestParam(required = false) String q) {
        return subjects.listActive(actor.orgId(), q);
    }
}
