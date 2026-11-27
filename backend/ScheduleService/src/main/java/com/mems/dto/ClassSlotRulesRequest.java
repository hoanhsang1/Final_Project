package com.mems.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ClassSlotRulesRequest(@NotNull List<@Valid ClassSlotRuleDto> rules) {
}
