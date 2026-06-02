package com.popups.pupoo.auth.persistence;

import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class SmsOtpRedisRepository {

    private static final String OTP_KEY_PREFIX = "auth:sms:otp:";
    private static final String COOLDOWN_KEY_PREFIX = "auth:sms:cooldown:";
    private static final String FAIL_KEY_PREFIX = "auth:sms:fail:";
    private static final String MINUTE_LIMIT_KEY_PREFIX = "auth:sms:request:min:";
    private static final String DAILY_LIMIT_KEY_PREFIX = "auth:sms:request:day:";
    private static final String ISSUED_KEY_PREFIX = "auth:sms:issued:";

    private final StringRedisTemplate redisTemplate;

    public SmsOtpRedisRepository(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void saveOtp(String phoneNumber, String codeHash, Duration ttl, Duration issuedMarkerTtl) {
        executeVoid(() -> {
            redisTemplate.opsForValue().set(otpKey(phoneNumber), codeHash, ttl);
            redisTemplate.opsForValue().set(issuedKey(phoneNumber), "1", issuedMarkerTtl);
            return null;
        });
    }

    public Optional<String> findOtpHash(String phoneNumber) {
        return execute(() -> Optional.ofNullable(redisTemplate.opsForValue().get(otpKey(phoneNumber))));
    }

    public boolean hasCooldown(String phoneNumber) {
        return Boolean.TRUE.equals(execute(() -> redisTemplate.hasKey(cooldownKey(phoneNumber))));
    }

    public void setCooldown(String phoneNumber, Duration ttl) {
        executeVoid(() -> {
            redisTemplate.opsForValue().set(cooldownKey(phoneNumber), "1", ttl);
            return null;
        });
    }

    public int getFailureCount(String phoneNumber) {
        String value = execute(() -> redisTemplate.opsForValue().get(failKey(phoneNumber)));
        return value == null ? 0 : Integer.parseInt(value);
    }

    public int incrementFailureCount(String phoneNumber, Duration ttl) {
        Long count = execute(() -> redisTemplate.opsForValue().increment(failKey(phoneNumber)));
        executeVoid(() -> {
            redisTemplate.expire(failKey(phoneNumber), ttl);
            return null;
        });
        return count == null ? 0 : count.intValue();
    }

    public long incrementMinuteRequestCount(String phoneNumber, Duration ttl) {
        return incrementCounter(minuteLimitKey(phoneNumber), ttl);
    }

    public long incrementDailyRequestCount(String phoneNumber, ZoneId zoneId) {
        ZonedDateTime now = ZonedDateTime.now(zoneId);
        ZonedDateTime tomorrow = LocalDate.now(zoneId).plusDays(1).atStartOfDay(zoneId);
        Duration ttl = Duration.between(now, tomorrow);
        return incrementCounter(dailyLimitKey(phoneNumber, now.toLocalDate().toString()), ttl);
    }

    public boolean hasIssuedMarker(String phoneNumber) {
        return Boolean.TRUE.equals(execute(() -> redisTemplate.hasKey(issuedKey(phoneNumber))));
    }

    public void clearVerificationState(String phoneNumber) {
        executeVoid(() -> {
            redisTemplate.delete(List.of(
                    otpKey(phoneNumber),
                    failKey(phoneNumber),
                    issuedKey(phoneNumber)
            ));
            return null;
        });
    }

    public void clearOtpAfterSendFailure(String phoneNumber) {
        executeVoid(() -> {
            redisTemplate.delete(List.of(
                    otpKey(phoneNumber),
                    cooldownKey(phoneNumber),
                    failKey(phoneNumber),
                    issuedKey(phoneNumber)
            ));
            return null;
        });
    }

    public void clearFailureCount(String phoneNumber) {
        executeVoid(() -> {
            redisTemplate.delete(failKey(phoneNumber));
            return null;
        });
    }

    private long incrementCounter(String key, Duration ttl) {
        Long count = execute(() -> redisTemplate.opsForValue().increment(key));
        executeVoid(() -> {
            redisTemplate.expire(key, ttl);
            return null;
        });
        return count == null ? 0L : count;
    }

    private <T> T execute(RedisCallback<T> callback) {
        try {
            return callback.doInRedis();
        } catch (DataAccessException e) {
            throw new BusinessException(ErrorCode.REDIS_UNAVAILABLE, "Redis 처리 중 오류가 발생했습니다.");
        }
    }

    private void executeVoid(RedisCallback<Void> callback) {
        execute(callback);
    }

    private String otpKey(String phoneNumber) {
        return OTP_KEY_PREFIX + phoneNumber;
    }

    private String cooldownKey(String phoneNumber) {
        return COOLDOWN_KEY_PREFIX + phoneNumber;
    }

    private String failKey(String phoneNumber) {
        return FAIL_KEY_PREFIX + phoneNumber;
    }

    private String minuteLimitKey(String phoneNumber) {
        return MINUTE_LIMIT_KEY_PREFIX + phoneNumber;
    }

    private String dailyLimitKey(String phoneNumber, String day) {
        return DAILY_LIMIT_KEY_PREFIX + day + ":" + phoneNumber;
    }

    private String issuedKey(String phoneNumber) {
        return ISSUED_KEY_PREFIX + phoneNumber;
    }

    @FunctionalInterface
    private interface RedisCallback<T> {
        T doInRedis();
    }
}
