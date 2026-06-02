package com.popups.pupoo.gallery.api;

import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.storage.application.StorageService;
import com.popups.pupoo.storage.dto.UploadResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class GalleryImageUploadController {

    private final StorageService storageService;

    @PostMapping("/api/admin/galleries/images/upload")
    public ApiResponse<Map<String, List<String>>> uploadAdmin(
            @RequestPart("files") List<MultipartFile> files
    ) {
        return ApiResponse.success(Map.of("urls", storageService.uploadGalleryImagesForAdmin(files)));
    }

    @PostMapping("/api/galleries/image/upload")
    public ApiResponse<UploadResponse> uploadUser(@RequestPart("file") MultipartFile file) {
        return ApiResponse.success(storageService.uploadForGalleryTemp(file));
    }
}
