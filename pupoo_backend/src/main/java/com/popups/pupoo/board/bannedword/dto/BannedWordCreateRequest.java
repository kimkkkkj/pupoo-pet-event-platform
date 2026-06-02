package com.popups.pupoo.board.bannedword.dto;

import com.popups.pupoo.board.bannedword.domain.enums.BannedWordCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class BannedWordCreateRequest {

    @NotBlank(message = "금지어는 필수입니다.")
    @Size(max = 100)
    private String bannedWord;

    @NotNull(message = "카테고리는 필수입니다.")
    private BannedWordCategory category;

    @Size(max = 100)
    private String replacement;
}
