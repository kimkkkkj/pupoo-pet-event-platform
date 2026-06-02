"""payments/refunds builder."""

from __future__ import annotations

from datetime import timedelta
from typing import Any


class PaymentBuilder:
    """Generate payment and refund rows tied to event_apply."""

    def __init__(self, context: Any) -> None:
        self.ctx = context
        self.pool = context.pools

    def build(self, event_applies: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        if not self.ctx.config.get("payments", {}).get("enabled", True):
            return [], []

        reasons = self.pool.pools.get("payment_refund_reasons_ko", ["개인 사정으로 취소 요청"])
        payments: list[dict[str, Any]] = []
        refunds: list[dict[str, Any]] = []

        eligible = [row for row in event_applies if row["status"] in {"APPROVED", "APPLIED"}]
        for idx, apply_row in enumerate(eligible):
            if self.ctx.rng.random() > 0.58:
                continue
            payment_id = self.ctx.next_id("payments")
            requested_at = apply_row["applied_at"] + timedelta(minutes=self.ctx.rng.randint(5, 240))
            status = self.ctx.rng.choices(
                ["APPROVED", "REQUESTED", "REFUNDED", "CANCELLED", "FAILED"],
                weights=[72, 8, 9, 7, 4],
                k=1,
            )[0]

            amount = self.ctx.rng.choice([3000, 5000, 7000, 9000, 12000])
            payments.append(
                {
                    "payment_id": payment_id,
                    "user_id": apply_row["user_id"],
                    "event_id": apply_row["event_id"],
                    "event_apply_id": apply_row["apply_id"],
                    "order_no": f"PO{apply_row['event_id']:02d}{apply_row['user_id']:06d}{idx:04d}",
                    "amount": float(amount),
                    "payment_method": self.ctx.rng.choices(
                        ["KAKAOPAY", "CARD", "BANK", "OTHER"],
                        weights=[50, 38, 10, 2],
                        k=1,
                    )[0],
                    "status": status,
                    "requested_at": requested_at,
                }
            )

            if status in {"REFUNDED", "CANCELLED"} and self.ctx.rng.random() < 0.82:
                refund_status = self.ctx.rng.choices(
                    ["REQUESTED", "APPROVED", "REJECTED", "COMPLETED"],
                    weights=[20, 22, 14, 44],
                    k=1,
                )[0]
                requested_refund_at = requested_at + timedelta(days=self.ctx.rng.randint(0, 20))
                completed_at = (
                    requested_refund_at + timedelta(days=self.ctx.rng.randint(1, 5))
                    if refund_status == "COMPLETED"
                    else None
                )
                refunds.append(
                    {
                        "refund_id": self.ctx.next_id("refunds"),
                        "payment_id": payment_id,
                        "refund_amount": float(amount),
                        "reason": self.ctx.rng.choice(reasons),
                        "status": refund_status,
                        "requested_at": requested_refund_at,
                        "completed_at": completed_at,
                        "created_at": requested_refund_at,
                        "updated_at": requested_refund_at if completed_at is None else completed_at,
                    }
                )

        return payments, refunds
