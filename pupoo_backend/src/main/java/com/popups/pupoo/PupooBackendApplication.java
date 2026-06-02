// file: src/main/java/com/popups/pupoo/PupooBackendApplication.java
package com.popups.pupoo;

import com.popups.pupoo.payment.infrastructure.KakaoPayProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(KakaoPayProperties.class)
public class PupooBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(PupooBackendApplication.class, args);
	}

}
