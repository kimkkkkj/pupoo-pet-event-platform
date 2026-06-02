// file: src/main/java/com/popups/pupoo/common/audit/aspect/AdminAuditAspect.java
package com.popups.pupoo.common.audit.aspect;

import com.popups.pupoo.common.audit.annotation.AdminAudit;
import com.popups.pupoo.common.audit.application.AdminLogService;
import com.popups.pupoo.common.audit.domain.enums.AdminTargetType;
import com.popups.pupoo.common.audit.web.AdminAuditInterceptor;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.core.DefaultParameterNameDiscoverer;
import org.springframework.expression.EvaluationContext;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.lang.reflect.Method;

/**
 * @AdminAudit 기반 관리자 감사 로그 AOP.
 *
 * 정책
 * - 감사로그 실패는 비즈니스 실패로 전파하지 않는다.
 * - 비즈니스 예외(BusinessException) 발생 시에도 감사로그를 남기되 action에 "|FAIL|{ErrorCode}"를 suffix로 붙인다.
 *
 * 주의
 * - @Around는 반드시 Object를 반환해야 한다.
 * - finally 블록에서 return을 사용하지 않는다.
 */
@Aspect
@Component
@RequiredArgsConstructor
public class AdminAuditAspect {

    private final AdminLogService adminLogService;

    private final ExpressionParser parser = new SpelExpressionParser();
    private final DefaultParameterNameDiscoverer nameDiscoverer = new DefaultParameterNameDiscoverer();

    @Around("@annotation(adminAudit)")
    public Object around(ProceedingJoinPoint pjp, AdminAudit adminAudit) throws Throwable {
        Method method = ((MethodSignature) pjp.getSignature()).getMethod();

        Object result = null;
        Throwable error = null;

        try {
            result = pjp.proceed();
            return result;
        } catch (Throwable t) {
            error = t;
            throw t;
        } finally {
            try {
                EvaluationContext ctx = buildContext(pjp, method, result);

                String action = resolveAction(adminAudit, ctx);
                if (action == null || action.isBlank()) {
                    // 감사로그 액션이 없으면 저장만 스킵
                } else {
                    AdminTargetType targetType = resolveTargetType(adminAudit, ctx);
                    Long targetId = resolveTargetId(adminAudit, ctx);

                    if (error != null) {
                        String errorCode;
                        if (error instanceof BusinessException be) {
                            errorCode = be.getErrorCode().name();
                        } else {
                            errorCode = ErrorCode.INTERNAL_ERROR.name();
                        }
                        action = truncate(action + "|FAIL|" + errorCode, 255);
                        adminLogService.writeFailure(action, targetType, targetId, errorCode);
                    } else {
                        action = truncate(action, 255);
                        adminLogService.write(action, targetType, targetId);
                    }
                    markRequestLogged();
                }
            } catch (Exception ignored) {
                // 감사 로그 실패는 무시
            }
        }
    }

    private EvaluationContext buildContext(ProceedingJoinPoint pjp, Method method, Object result) {
        StandardEvaluationContext ctx = new StandardEvaluationContext();

        String[] paramNames = nameDiscoverer.getParameterNames(method);
        Object[] args = pjp.getArgs();

        if (paramNames != null) {
            for (int i = 0; i < paramNames.length && i < args.length; i++) {
                ctx.setVariable(paramNames[i], args[i]);
            }
        }

        ctx.setVariable("result", result);
        return ctx;
    }

    private String resolveAction(AdminAudit ann, EvaluationContext ctx) {
        if (ann == null) {
            return null;
        }

        String spel = ann.actionSpel();
        if (spel != null && !spel.isBlank()) {
            Object v = parser.parseExpression(spel).getValue(ctx);
            return v == null ? null : String.valueOf(v);
        }

        return ann.action();
    }

    private AdminTargetType resolveTargetType(AdminAudit ann, EvaluationContext ctx) {
        if (ann == null) {
            return AdminTargetType.OTHER;
        }

        String spel = ann.targetTypeSpel();
        if (spel != null && !spel.isBlank()) {
            Object v = parser.parseExpression(spel).getValue(ctx);
            if (v == null) {
                return AdminTargetType.OTHER;
            }
            if (v instanceof AdminTargetType att) {
                return att;
            }
            try {
                return AdminTargetType.valueOf(String.valueOf(v));
            } catch (Exception e) {
                return AdminTargetType.OTHER;
            }
        }

        return ann.targetType();
    }

    private Long resolveTargetId(AdminAudit ann, EvaluationContext ctx) {
        if (ann == null) {
            return null;
        }

        String spel = ann.targetIdSpel();
        if (spel == null || spel.isBlank()) {
            return null;
        }

        Object v = parser.parseExpression(spel).getValue(ctx);
        if (v == null) {
            return null;
        }
        if (v instanceof Number n) {
            return n.longValue();
        }
        try {
            return Long.parseLong(String.valueOf(v));
        } catch (Exception e) {
            return null;
        }
    }

    private String truncate(String s, int max) {
        if (s == null) {
            return null;
        }
        if (s.length() <= max) {
            return s;
        }
        return s.substring(0, max);
    }

    private void markRequestLogged() {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes)) {
            return;
        }
        attributes.getRequest().setAttribute(AdminAuditInterceptor.REQUEST_ATTRIBUTE, Boolean.TRUE);
    }
}
