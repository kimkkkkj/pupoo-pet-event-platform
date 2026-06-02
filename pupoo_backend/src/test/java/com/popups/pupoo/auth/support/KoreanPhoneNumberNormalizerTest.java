package com.popups.pupoo.auth.support;

import com.popups.pupoo.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class KoreanPhoneNumberNormalizerTest {

    @Test
    void normalizesDomesticPhoneNumberToE164() {
        assertEquals("+821012345678", KoreanPhoneNumberNormalizer.normalizeToE164("01012345678"));
    }

    @Test
    void normalizesInternationalPhoneNumberWithoutPlus() {
        assertEquals("+821012345678", KoreanPhoneNumberNormalizer.normalizeToE164("821012345678"));
    }

    @Test
    void keepsE164PhoneNumber() {
        assertEquals("+821012345678", KoreanPhoneNumberNormalizer.normalizeToE164("+821012345678"));
    }

    @Test
    void rejectsInvalidPhoneNumber() {
        assertThrows(BusinessException.class, () -> KoreanPhoneNumberNormalizer.normalizeToE164("12345"));
    }
}
