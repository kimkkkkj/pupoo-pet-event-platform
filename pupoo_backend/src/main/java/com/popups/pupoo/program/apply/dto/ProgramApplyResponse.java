/* file: src/main/java/com/popups/pupoo/program/apply/dto/ProgramApplyResponse.java */
package com.popups.pupoo.program.apply.dto;

import com.popups.pupoo.program.apply.domain.enums.ApplyStatus;
import com.popups.pupoo.program.apply.domain.model.ProgramApply;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ProgramApplyResponse {

    private Long programApplyId;
    private Long programId;
    private Long userId;
    private Long petId;
    private String petName;
    private String ownerNickname;
    private String imageUrl;
    private ApplyStatus status;
    private String ticketNo;
    private Integer etaMin;
    private LocalDateTime notifiedAt;
    private LocalDateTime checkedInAt;
    private LocalDateTime createdAt;

    public static ProgramApplyResponse from(
            ProgramApply apply,
            String petName,
            String ownerNickname,
            String imageUrl
    ) {
        if (apply == null) {
            throw new IllegalArgumentException("ProgramApply is null");
        }

        return ProgramApplyResponse.builder()
                .programApplyId(apply.getProgramApplyId())
                .programId(apply.getProgramId())
                .userId(apply.getUserId())
                .petId(apply.getPetId())
                .petName(petName)
                .ownerNickname(ownerNickname)
                .imageUrl(imageUrl)
                .status(apply.getStatus())
                .ticketNo(apply.getTicketNo())
                .etaMin(apply.getEtaMin())
                .notifiedAt(apply.getNotifiedAt())
                .checkedInAt(apply.getCheckedInAt())
                .createdAt(apply.getCreatedAt())
                .build();
    }
}
