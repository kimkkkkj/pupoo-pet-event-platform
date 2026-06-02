// file: src/main/java/com/popups/pupoo/common/audit/annotation/AdminAudit.java
package com.popups.pupoo.common.audit.annotation;

import com.popups.pupoo.common.audit.domain.enums.AdminTargetType;

import java.lang.annotation.*;

/**
 * 관리자 감사 로그 자동 적재용 어노테이션.
 *
 * 사용 방식
 * - 단순 케이스: action + targetType + targetIdSpel 지정
 * - 동적 케이스: actionSpel / targetTypeSpel 사용
 *
 * 주의
 * - SpEL은 메서드 파라미터명 기반(#param)으로 평가된다. (컴파일 시 -parameters 권장)
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface AdminAudit {

    /** 고정 액션(예: "EVENT_CREATE") */
    String action() default "";

    /** SpEL 기반 액션(예: "'USER_SUSPEND|reason=' + #reason" ) */
    String actionSpel() default "";

    /** 고정 타겟 타입 */
    AdminTargetType targetType() default AdminTargetType.OTHER;

    /** SpEL 기반 타겟 타입(예: "#result.targetType") */
    String targetTypeSpel() default "";

    /** SpEL 기반 타겟 ID(예: "#eventId" 또는 "#result.id") */
    String targetIdSpel() default "";
}
