// file: src/main/java/com/popups/pupoo/common/util/BcryptHashPrinter.java
package com.popups.pupoo.common.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class BcryptHashPrinter {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String rawPassword = (args != null && args.length > 0 && args[0] != null && !args[0].isBlank())
                ? args[0]
                : System.getenv().getOrDefault("BCRYPT_INPUT", "admin1234");
        System.out.println(encoder.encode(rawPassword));
    }
}
