package com.mems.controller;
import com.mems.service.PermissionCatalog;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/internal/permissions")
public class InternalPermissionController {
    @GetMapping
    public List<PermissionCatalog.PermissionDefinition> permissions() { return PermissionCatalog.ENTRIES; }

    /** Bundle để PeopleService mở rộng quyền của chức vụ (Identity là nguồn chuẩn). */
    @GetMapping("/bundles")
    public List<PermissionCatalog.BundleDefinition> bundles() { return PermissionCatalog.BUNDLES; }
}
