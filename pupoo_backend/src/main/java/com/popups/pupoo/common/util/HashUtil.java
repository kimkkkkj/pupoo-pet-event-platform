// file: src/main/java/com/popups/pupoo/common/util/HashUtil.java
package com.popups.pupoo.common.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * 해시 유틸
 *
 * - DB에 토큰/OTP 원문을 저장하지 않기 위해 SHA-256 해시(hex) 값을 생성한다.
 * - 입력값에 서버 측 secret salt를 결합해, 유출 시 재현 가능성을 낮춘다.
 */
public final class HashUtil {

    private HashUtil() {
    }

    public static String sha256Hex(String value) {
        if (value == null) {
            throw new IllegalArgumentException("value is null");
        }

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return toHex(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not supported", e);
        }
    }

    private static String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
