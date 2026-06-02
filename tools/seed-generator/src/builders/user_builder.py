"""users builder."""

from __future__ import annotations

from datetime import timedelta
from typing import Any


PASSWORD_HASH = "$2a$12$N2Q5YV2fQkQsl9gUj3Q4Xe4WgqF4V7vCkK0w6Q8D8A4uQXq3x0Y5a"


class UserBuilder:
    """Generate users rows with schema-compatible columns."""

    def __init__(self, context: Any) -> None:
        self.ctx = context
        self.pool = context.pools

    def build(self) -> list[dict[str, Any]]:
        count = int(self.ctx.config["users"]["count"])
        users: list[dict[str, Any]] = []
        used_nicknames: set[str] = set()

        admin_rows = [
            ("admin.ops@pupoo.kr", "01090000001", "운영관리자1"),
            ("admin.biz@pupoo.kr", "01090000002", "운영관리자2"),
        ]
        for email, phone, nickname in admin_rows:
            users.append(
                {
                    "user_id": self.ctx.next_id("users"),
                    "email": email,
                    "password": PASSWORD_HASH,
                    "nickname": nickname,
                    "phone": phone,
                    "status": "ACTIVE",
                    "role_name": "ADMIN",
                    "show_age": 0,
                    "show_gender": 0,
                    "show_pet": 1,
                    "email_verified": 1,
                    "phone_verified": 1,
                    "created_at": self.ctx.now - timedelta(days=365),
                    "last_login_at": self.ctx.now - timedelta(days=1),
                    "last_modified_at": self.ctx.now - timedelta(days=1),
                }
            )
            used_nicknames.add(nickname)

        nickname_pool = self.pool.pools.get("nickname_pool", [])
        for seq in range(len(users) + 1, count + 1):
            surname = self.pool.get_random_value("surnames_ko")
            given = self.pool.get_random_value("given_names_ko")
            nickname = self._pick_nickname(seq, surname, given, nickname_pool, used_nicknames)
            created_at = self.ctx.now - timedelta(days=self.ctx.rng.randint(0, 500))
            users.append(
                {
                    "user_id": self.ctx.next_id("users"),
                    "email": f"user{seq:05d}@pupoo.kr",
                    "password": PASSWORD_HASH,
                    "nickname": nickname,
                    "phone": f"010{seq:08d}",
                    "status": "ACTIVE",
                    "role_name": "USER",
                    "show_age": self.ctx.rng.choice([0, 0, 0, 1]),
                    "show_gender": self.ctx.rng.choice([0, 0, 1]),
                    "show_pet": self.ctx.rng.choice([0, 1, 1]),
                    "email_verified": 1,
                    "phone_verified": 1,
                    "created_at": created_at,
                    "last_login_at": created_at + timedelta(days=self.ctx.rng.randint(0, 200)),
                    "last_modified_at": self.ctx.now - timedelta(days=self.ctx.rng.randint(0, 30)),
                }
            )

        return users

    def _pick_nickname(
        self,
        seq: int,
        surname: str,
        given: str,
        nickname_pool: list[str],
        used_nicknames: set[str],
    ) -> str:
        if nickname_pool:
            candidate = nickname_pool[(seq * 7) % len(nickname_pool)]
            if candidate not in used_nicknames and 2 <= len(candidate) <= 16:
                used_nicknames.add(candidate)
                return candidate

        suffixes = ["아빠", "엄마", "누나", "형", "집사", "맘", "러버"]
        stems = [given, f"{surname}{given}", given[:1] + given[-1:]]
        self.ctx.rng.shuffle(stems)
        self.ctx.rng.shuffle(suffixes)

        for stem in stems:
            for suffix in suffixes:
                nickname = f"{stem}{suffix}"[:16]
                if nickname not in used_nicknames:
                    used_nicknames.add(nickname)
                    return nickname

        fallback = f"{given}{seq}"[:16]
        while fallback in used_nicknames:
            seq += 1
            fallback = f"{given}{seq}"[:16]
        used_nicknames.add(fallback)
        return fallback
