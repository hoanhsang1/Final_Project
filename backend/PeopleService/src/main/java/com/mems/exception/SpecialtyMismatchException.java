package com.mems.exception;

import com.mems.dto.ClassMismatch;

import java.util.List;

public class SpecialtyMismatchException extends RuntimeException {
    private final List<ClassMismatch> classes;

    public SpecialtyMismatchException(List<ClassMismatch> classes) {
        super("Specialties no longer match the subject of assigned classes");
        this.classes = List.copyOf(classes);
    }

    public List<ClassMismatch> getClasses() { return classes; }
}
