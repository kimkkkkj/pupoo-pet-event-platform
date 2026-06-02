CREATE TABLE IF NOT EXISTS password_reset_token (
    password_reset_token_id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (password_reset_token_id),
    UNIQUE KEY uk_prt_token_hash (token_hash),
    KEY ix_prt_user_id_created_at (user_id, created_at),
    CONSTRAINT fk_prt_user_id FOREIGN KEY (user_id) REFERENCES users (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
