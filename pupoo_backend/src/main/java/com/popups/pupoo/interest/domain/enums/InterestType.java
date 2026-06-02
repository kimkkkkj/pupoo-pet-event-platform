// file: src/main/java/com/popups/pupoo/interest/domain/enums/InterestType.java
package com.popups.pupoo.interest.domain.enums;

/**
 * 관심사 타입(분류)
 *
 * - SYSTEM : 행사/프로그램 축 관심사(이벤트/세션/체험/부스/콘테스트/공지 등)
 * - USER   : 사용자 취향/라이프스타일 축(간식/미용/건강/훈련 등)
 *
 *  참고
 * - "결제/환불 같은 시스템 알림"의 의미가 아니다.
 *   알림 메시지 자체는 notification 도메인에서 다룬다.
 * - interest는 어디까지나 "관심 카테고리(구독 기준)"이다.
 */
public enum InterestType {
    SYSTEM,
    USER
}
