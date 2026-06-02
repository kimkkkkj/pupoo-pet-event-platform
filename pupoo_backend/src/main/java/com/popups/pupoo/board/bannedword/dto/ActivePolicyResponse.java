package com.popups.pupoo.board.bannedword.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ActivePolicyResponse {
    private String activeCollection;
    private String activeFilename;
    private String activatedAt;
}

