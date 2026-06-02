"""pet builder."""

from __future__ import annotations

from collections import Counter
from typing import Any


class PetBuilder:
    """Generate pets with per-user uniqueness and balanced name usage."""

    def __init__(self, context: Any) -> None:
        self.ctx = context
        self.pool = context.pools

    def build(self, users: list[dict[str, Any]]) -> list[dict[str, Any]]:
        ratio = float(self.ctx.config["pets"]["ownership_ratio"])
        max_per_user = int(self.ctx.config["pets"]["max_per_user"])
        pet_names = self.pool.pools.get("pet_names_ko", [])
        if not pet_names:
            raise ValueError("pet_names_ko pool is empty")

        pet_name_counter: Counter[str] = Counter()
        pets: list[dict[str, Any]] = []

        for user in users:
            if user["role_name"] != "USER":
                continue
            if self.ctx.rng.random() > ratio:
                continue

            pet_count = self.ctx.rng.choices([1, 2, 3], weights=[0.62, 0.28, 0.10], k=1)[0]
            pet_count = min(pet_count, max_per_user)
            used_names: set[str] = set()

            for _ in range(pet_count):
                pet_name = self._pick_balanced_name(pet_names, pet_name_counter, used_names)
                pet_breed = self.ctx.rng.choices(["DOG", "CAT", "OTHER"], weights=[0.68, 0.28, 0.04], k=1)[0]
                pet_weight = None
                if pet_breed in {"DOG", "CAT"}:
                    pet_weight = self.ctx.rng.choices(
                        ["XS", "S", "M", "L", "XL"],
                        weights=[0.16, 0.24, 0.32, 0.20, 0.08],
                        k=1,
                    )[0]

                pets.append(
                    {
                        "pet_id": self.ctx.next_id("pet"),
                        "user_id": user["user_id"],
                        "pet_name": pet_name,
                        "pet_breed": pet_breed,
                        "pet_age": self.ctx.rng.randint(1, 16),
                        "pet_weight": pet_weight,
                    }
                )
                pet_name_counter[pet_name] += 1

        return pets

    def _pick_balanced_name(
        self,
        names: list[str],
        counter: Counter[str],
        used_names: set[str],
    ) -> str:
        candidates = [name for name in names if name not in used_names]
        if not candidates:
            candidates = names[:]
        candidates.sort(key=lambda x: (counter[x], self.ctx.rng.random()))
        chosen = candidates[: max(10, len(candidates) // 6)]
        value = self.ctx.rng.choice(chosen)
        used_names.add(value)
        return value
