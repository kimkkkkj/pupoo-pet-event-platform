package com.popups.pupoo.storage.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.storage")
public class StorageProperties {

    private String mode = "local";
    private String basePath = "./uploads";
    private String publicPrefix = "/uploads";
    private String publicBaseUrl = "";
    private String cdnBaseUrl = "";
    private String keyPrefix = "uploads";
    private String bucket = "";
    private String region = "ap-northeast-2";
    /**
     * S3 호환 API 커스텀 엔드포인트 (IBM COS, MinIO 등).
     * 예: https://s3.us-south.cloud-object-storage.appdomain.cloud
     */
    private String serviceEndpoint = "";
    /**
     * true 시 path-style 요청(일부 COS/MinIO 구성에 필요).
     */
    private boolean pathStyleAccess = false;
    private String accessKeyId = "";
    private String secretAccessKey = "";
    private String sessionToken = "";
}
