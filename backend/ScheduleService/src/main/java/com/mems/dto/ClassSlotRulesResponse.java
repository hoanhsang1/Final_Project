package com.mems.dto;

import java.util.List;

public record ClassSlotRulesResponse(String classId, List<ClassSlotRuleDto> rules) {
}
