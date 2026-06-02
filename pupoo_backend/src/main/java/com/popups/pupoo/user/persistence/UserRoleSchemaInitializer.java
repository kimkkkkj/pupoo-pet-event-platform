package com.popups.pupoo.user.persistence;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
public class UserRoleSchemaInitializer {

    private static final Logger log = LoggerFactory.getLogger(UserRoleSchemaInitializer.class);
    private static final String DEFAULT_SUPER_ADMIN_EMAIL = "admin@pupoo.com";

    private final JdbcTemplate jdbcTemplate;

    public UserRoleSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    void ensureSuperAdminRoleSupport() {
        if (!hasUsersTable()) {
            log.warn("users table not found; skipping SUPER_ADMIN schema migration and bootstrap");
            return;
        }
        ensureRoleNameEnum();
        ensureDefaultSuperAdminAccount();
    }

    private boolean hasUsersTable() {
        Integer tableCount = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'users'
                """,
                Integer.class
        );
        return tableCount != null && tableCount > 0;
    }

    private void ensureRoleNameEnum() {
        String columnType = jdbcTemplate.query(
                """
                SELECT COLUMN_TYPE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'users'
                  AND COLUMN_NAME = 'role_name'
                """,
                rs -> rs.next() ? rs.getString("COLUMN_TYPE") : null
        );

        if (columnType == null) {
            log.warn("users.role_name column metadata not found; skipping SUPER_ADMIN schema migration");
            return;
        }

        if (columnType.toUpperCase(Locale.ROOT).contains("'SUPER_ADMIN'")) {
            return;
        }

        jdbcTemplate.execute("""
                ALTER TABLE users
                MODIFY COLUMN role_name ENUM('USER','ADMIN','SUPER_ADMIN')
                NOT NULL DEFAULT 'USER'
                COMMENT '권한명(USER/ADMIN/SUPER_ADMIN)'
                """);
        log.info("Expanded users.role_name enum to include SUPER_ADMIN");
    }

    private void ensureDefaultSuperAdminAccount() {
        Integer superAdminCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE role_name = 'SUPER_ADMIN'",
                Integer.class
        );
        if (superAdminCount != null && superAdminCount > 0) {
            return;
        }

        int updated = jdbcTemplate.update(
                """
                UPDATE users
                SET role_name = 'SUPER_ADMIN'
                WHERE email = ?
                  AND role_name = 'ADMIN'
                """,
                DEFAULT_SUPER_ADMIN_EMAIL
        );

        if (updated > 0) {
            log.info("Promoted {} to SUPER_ADMIN", DEFAULT_SUPER_ADMIN_EMAIL);
        }
    }
}
