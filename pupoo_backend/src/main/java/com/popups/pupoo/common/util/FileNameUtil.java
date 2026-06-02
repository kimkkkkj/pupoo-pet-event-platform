// file: src/main/java/com/popups/pupoo/common/util/FileNameUtil.java
package com.popups.pupoo.common.util;

import java.util.Locale;
import java.util.UUID;

public class FileNameUtil {

    private FileNameUtil() {}

    /**
     * 확장자가 존재할 경우 이를 유지하면서,
     * 파일명 충돌을 방지할 수 있는 고유한 저장용 파일명을 생성한다.
     */
    public static String generateStoredName(String originalFilename) {
        String ext = "";
        if (originalFilename != null) {
            int idx = originalFilename.lastIndexOf('.');
            if (idx >= 0 && idx < originalFilename.length() - 1) {
                ext = originalFilename.substring(idx + 1).toLowerCase(Locale.ROOT);
            }
        }

        String uuid = UUID.randomUUID().toString().replace("-", "");
        return ext.isBlank() ? uuid : uuid + "." + ext;
    }
}
