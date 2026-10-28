package com.mems.dto;
public record CreatedMemberResponse(MemberResponse member,String temporaryPassword,boolean mustChangePassword) {}
