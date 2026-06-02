package com.popups.pupoo.booth.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class BoothUpdateRequest {
    private String placeName;
    private String type;
    private String description;
    private String company;
    private String zone;
    private String status;
}
