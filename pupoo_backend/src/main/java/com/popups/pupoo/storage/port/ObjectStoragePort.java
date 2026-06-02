// file: src/main/java/com/popups/pupoo/storage/port/ObjectStoragePort.java
package com.popups.pupoo.storage.port;

import java.io.InputStream;

/**
 * Object storage abstraction used by both local filesystem mode and S3 mode.
 */
public interface ObjectStoragePort {

    void putObject(String bucket, String key, byte[] bytes, String contentType);

    InputStream getObject(String bucket, String key);

    void deleteObject(String bucket, String key);

    /**
     * Legacy compatibility helper.
     * New service/mapper code should prefer StorageUrlResolver for final public URL assembly.
     */
    String getPublicPath(String bucket, String key);
}
