package com.popups.pupoo.board.bannedword.dto;

import com.popups.pupoo.board.bannedword.domain.enums.BannedWordCategory;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class BannedWordUpdateRequest {

    @Size(max = 100)
    private String bannedWord;

    private BannedWordCategory category;

    @Size(max = 100)
    private String replacement;
}
