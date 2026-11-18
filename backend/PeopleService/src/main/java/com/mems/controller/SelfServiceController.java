package com.mems.controller;

import com.mems.dto.DepartmentResponse;
import com.mems.dto.ResignationCreateRequest;
import com.mems.dto.ResignationResponse;
import com.mems.dto.TransferCreateRequest;
import com.mems.dto.TransferResponse;
import com.mems.service.DepartmentService;
import com.mems.service.ResignationService;
import com.mems.service.TransferService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Tự phục vụ: nhân sự gửi yêu cầu nghỉ việc/chuyển phòng cho chính mình. */
@RestController
@RequestMapping("/users/me")
public class SelfServiceController {
    private final ResignationService resignations;
    private final TransferService transfers;
    private final DepartmentService departments;

    public SelfServiceController(ResignationService resignations, TransferService transfers,
                                 DepartmentService departments) {
        this.resignations = resignations;
        this.transfers = transfers;
        this.departments = departments;
    }

    @GetMapping("/transfer-departments")
    public List<DepartmentResponse> transferDepartments() {
        return departments.transferTargets();
    }

    @GetMapping("/resignation-requests")
    public List<ResignationResponse> myResignations(
        @RequestParam(required = false) String status) {
        return resignations.mine(status);
    }

    @PostMapping("/resignation-requests")
    public ResponseEntity<ResignationResponse> resign(
        @Valid @RequestBody ResignationCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(resignations.createSelf(request));
    }

    @PostMapping("/transfer-requests")
    public ResponseEntity<TransferResponse> transfer(
        @Valid @RequestBody TransferCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(transfers.createSelf(request));
    }
}
