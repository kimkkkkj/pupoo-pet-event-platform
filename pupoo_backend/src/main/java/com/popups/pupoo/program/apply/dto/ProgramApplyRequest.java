// file: src/main/java/com/popups/pupoo/program/apply/dto/ProgramApplyRequest.java
package com.popups.pupoo.program.apply.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ProgramApplyRequest {
    private Long programId;
    private Long petId;
    private String imageUrl;
}
