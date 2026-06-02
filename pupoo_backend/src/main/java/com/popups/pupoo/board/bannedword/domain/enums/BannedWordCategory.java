package com.popups.pupoo.board.bannedword.domain.enums;

/**
 * 금칙어 카테고리 (board_banned_words.category)
 * - Pupoo_Moderation_Policy 정책 코드(POL-001~POL-016) 및 RAG 모더레이션 판정과 동일 코드 사용
 */
public enum BannedWordCategory {
    LEGAL_RESTRICTION,              // POL-002 법적/불법 정보
    ABUSE_INSULT,                   // POL-003 욕설 및 비하
    HATE_SPEECH,                    // POL-004 혐오 및 차별
    ADULT_CONTENT,                  // POL-005 음란 및 선정성
    SPAM_ADVERTISING,               // POL-008 광고 및 도배
    PET_SENSITIVE,                  // POL-009 애견 플랫폼 특화(민감어)
    COMMERCIAL_SALE,                // POL-010 영리 목적 분양/교배
    SYSTEM_ABUSE,                   // POL-011 시스템 어뷰징/티켓
    PII_COLLECTION_AND_EXPOSURE,    // POL-001 개인정보 보호 및 노출 금지
    DEFAMATION_HARASSMENT,          // POL-006 명예훼손·괴롭힘
    COPYRIGHT_VIOLATION,            // POL-007 저작권 위반
    MINOR_AGE_RESTRICTION,         // POL-012 이용 안내·연령
    PAYMENT_REFUND_POLICY,         // POL-013 결제·환불
    BOARD_COMMUNITY_POLICY,        // POL-014 게시판·커뮤니티
    REPORT_MODERATION,             // POL-015 신고·모더레이션
    OTHER                           // POL-016 기타
}
