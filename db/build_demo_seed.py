# -*- coding: utf-8 -*-
"""
Build a deployment-sized demo seed from the full operational seed.

Strategy (agreed with user):
  * Keep all 15 events; only re-base their dates around TODAY (2026-06-02).
    Distribution: ONGOING 4 / PLANNED 5 / ENDED 6.
  * Per-event delta = new_start_at - old_start_at (whole days).
    The SAME delta is added to every child datetime that belongs to that
    event, so relative timing (session day/time, payment/QR ordering, ...)
    is preserved. No absolute timestamps are hard-coded into children.
  * Differential trimming:
      - ONGOING events keep generous program/booth/congestion data
        (so realtime + AI charts look full; AI timeseries files regenerate
         from this base data).
      - ENDED/PLANNED events + pure log tables (qr_logs, notification_inbox)
        are trimmed aggressively.
  * users are kept in full (parent table; trimming would force re-mapping).

Non-INSERT lines (preamble SET/DELETE, footer) pass through verbatim.
"""
import re
import sys
from datetime import datetime, timedelta

SRC = "pupoo_seed_v6.6_practical_image_urls_rewritten.sql"
OUT = "pupoo_seed_demo.sql"

TODAY = datetime(2026, 6, 2)

# event_id -> (new_start_date 'YYYY-MM-DD', new_status). Time-of-day stays 09:00.
NEW_EVENT = {
    1:  ("2026-05-29", "ONGOING"),
    2:  ("2026-05-30", "ONGOING"),
    3:  ("2026-05-28", "ONGOING"),
    4:  ("2026-05-27", "ONGOING"),
    5:  ("2026-06-20", "PLANNED"),
    6:  ("2026-07-01", "PLANNED"),
    7:  ("2026-05-10", "ENDED"),    # recently ended -> populates closed analytics
    8:  ("2025-12-01", "ENDED"),    # delta 0 (already past)
    9:  ("2025-11-10", "ENDED"),
    10: ("2025-10-05", "ENDED"),
    11: ("2025-09-01", "ENDED"),
    12: ("2025-08-20", "ENDED"),
    13: ("2026-06-25", "PLANNED"),
    14: ("2026-07-10", "PLANNED"),
    15: ("2026-08-01", "PLANNED"),
}
ON_EVENTS = {eid for eid, (_, st) in NEW_EVENT.items() if st == "ONGOING"}

# ---- differential caps -------------------------------------------------
CAP_PROGRAM_OTHER = 8     # event_program per non-ongoing event (ongoing: all)
CAP_BOOTH_OTHER   = 6     # booths per non-ongoing event (ongoing: all)
CAP_CONGEST_OTHER = 10    # congestions per non-ongoing event (ongoing: all)
CAP_APPLY_ON      = 80    # event_apply per ongoing event
CAP_APPLY_OTHER   = 20
CAP_QR_ON         = 60    # qr_codes per ongoing event
CAP_QR_OTHER      = 10
CAP_QRLOG_ON      = 100   # qr_logs per ongoing event (pure log -> aggressive)
CAP_QRLOG_OTHER   = 10
CAP_PA_ON         = 10    # event_program_apply per program (ongoing)
CAP_PA_OTHER      = 3
CAP_REVIEW        = 25    # reviews per event (all events)
CAP_RCMT          = 3     # review_comments per review
CAP_GALLERY_ON    = 20    # galleries per ongoing event
CAP_GALLERY_OTHER = 5
CAP_GLIKE         = 5     # gallery_likes per gallery
CAP_INBOX         = 400   # notification_inbox global

# ---- low-level SQL row tokenizer --------------------------------------
def split_rows(text):
    """Split the VALUES region into a list of inner-row strings (no outer parens)."""
    rows, buf = [], []
    depth = 0
    in_str = False
    started = False
    i, n = 0, len(text)
    while i < n:
        c = text[i]
        if in_str:
            buf.append(c)
            if c == "\\" and i + 1 < n:
                buf.append(text[i + 1]); i += 2; continue
            if c == "'":
                if i + 1 < n and text[i + 1] == "'":
                    buf.append("'"); i += 2; continue
                in_str = False
            i += 1; continue
        if c == "'":
            in_str = True; buf.append(c); i += 1; continue
        if c == "(":
            if depth == 0:
                buf = []; started = True; depth = 1; i += 1; continue
            depth += 1; buf.append(c); i += 1; continue
        if c == ")":
            depth -= 1
            if depth == 0 and started:
                rows.append("".join(buf)); started = False; i += 1; continue
            buf.append(c); i += 1; continue
        if started:
            buf.append(c)
        i += 1
    return rows


def split_values(inner):
    """Split one inner-row string into top-level value tokens (quotes preserved)."""
    vals, buf = [], []
    in_str = False
    i, n = 0, len(inner)
    while i < n:
        c = inner[i]
        if in_str:
            buf.append(c)
            if c == "\\" and i + 1 < n:
                buf.append(inner[i + 1]); i += 2; continue
            if c == "'":
                if i + 1 < n and inner[i + 1] == "'":
                    buf.append("'"); i += 2; continue
                in_str = False
            i += 1; continue
        if c == "'":
            in_str = True; buf.append(c); i += 1; continue
        if c == ",":
            vals.append("".join(buf).strip()); buf = []; i += 1; continue
        buf.append(c); i += 1
    vals.append("".join(buf).strip())
    return vals


def to_int(tok):
    t = tok.strip()
    if t == "NULL" or t == "":
        return None
    if t[0] == "'" and t[-1] == "'":
        t = t[1:-1]
    try:
        return int(t)
    except ValueError:
        return None


def shift_dt(tok, days):
    if days == 0:
        return tok
    t = tok.strip()
    if not (len(t) >= 2 and t[0] == "'" and t[-1] == "'"):
        return tok  # NULL or non-string
    inner = t[1:-1]
    try:
        dt = datetime.strptime(inner, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return tok
    return "'" + (dt + timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S") + "'"


def rebuild(vals):
    return "(" + ", ".join(vals) + ")"


# ---- statement collector ----------------------------------------------
HEADER_RE = re.compile(r"^INSERT INTO\s+`?(\w+)`?\s*\((.*)\)\s*VALUES\s*$")


def scan_in_str(line, in_str):
    """Advance single-quote string state across one physical line."""
    i, n = 0, len(line)
    while i < n:
        c = line[i]
        if in_str:
            if c == "\\":
                i += 2; continue
            if c == "'":
                if i + 1 < n and line[i + 1] == "'":
                    i += 2; continue
                in_str = False
            i += 1; continue
        if c == "'":
            in_str = True
        i += 1
    return in_str


# ---- per-event delta (filled once event table is parsed) --------------
delta = {}          # event_id -> int days

# id -> event_id maps (built from ALL parent rows as encountered)
prog2event, booth2event, qr2event = {}, {}, {}
apply2event, gal2event, rev2event, pay2event = {}, {}, {}, {}

# kept-id sets (built as parents are kept)
program_kept, booth_kept, qr_kept = set(), set(), set()
apply_kept, gal_kept, rev_kept, pay_kept = set(), set(), set(), set()

# counters for caps
cnt = {}
def bump(key):
    cnt[key] = cnt.get(key, 0) + 1
    return cnt[key]


def ev_delta(eid):
    return delta.get(eid, 0)


def process(table, cols, rows):
    """Return list of kept+transformed inner-row strings."""
    ix = {c: k for k, c in enumerate(cols)}
    out = []

    def keep_simple(date_cols, eid_getter):
        """Keep all rows; shift given date columns by row's event delta."""
        for r in rows:
            v = split_values(r)
            d = ev_delta(eid_getter(v))
            for dc in date_cols:
                if dc in ix:
                    v[ix[dc]] = shift_dt(v[ix[dc]], d)
            out.append(rebuild(v))

    # ---------- non-event tables: keep all, no shift ----------
    if table in ("users", "pet", "interests", "user_interest_subscriptions",
                 "boards", "speakers", "posts", "post_comments",
                 "notification", "notification_send", "notification_settings"):
        out.extend("(" + r + ")" for r in rows)
        return out

    # ---------- event ----------
    if table == "event":
        for r in rows:
            v = split_values(r)
            eid = to_int(v[ix["event_id"]])
            old_start = datetime.strptime(v[ix["start_at"]].strip("'"), "%Y-%m-%d %H:%M:%S")
            nd, status = NEW_EVENT[eid]
            new_start = datetime.strptime(nd + " 09:00:00", "%Y-%m-%d %H:%M:%S")
            d = (new_start.date() - old_start.date()).days
            delta[eid] = d
            v[ix["start_at"]] = shift_dt(v[ix["start_at"]], d)
            v[ix["end_at"]]   = shift_dt(v[ix["end_at"]], d)
            v[ix["status"]]   = "'" + status + "'"
            out.append(rebuild(v))
        return out

    # ---------- direct-event children, keep all ----------
    if table == "event_images":
        keep_simple(["created_at"], lambda v: to_int(v[ix["event_id"]])); return out
    if table == "event_congestion_policy":
        keep_simple(["created_at", "updated_at"], lambda v: to_int(v[ix["event_id"]])); return out
    if table == "event_interest_map":
        keep_simple(["created_at"], lambda v: to_int(v[ix["event_id"]])); return out
    if table == "notices":
        # event_id nullable; shift only when tied to an event
        for r in rows:
            v = split_values(r)
            eid = to_int(v[ix["event_id"]])
            d = ev_delta(eid) if eid is not None else 0
            for dc in ("created_at", "updated_at"):
                v[ix[dc]] = shift_dt(v[ix[dc]], d)
            out.append(rebuild(v))
        return out

    # ---------- booths (ON: all, others: cap) ----------
    if table == "booths":
        for r in rows:
            v = split_values(r)
            bid = to_int(v[ix["booth_id"]]); eid = to_int(v[ix["event_id"]])
            booth2event[bid] = eid
            if eid in ON_EVENTS or bump(("booth", eid)) <= CAP_BOOTH_OTHER:
                booth_kept.add(bid)
                v[ix["created_at"]] = shift_dt(v[ix["created_at"]], ev_delta(eid))
                out.append(rebuild(v))
        return out

    # ---------- event_program (ON: all, others: cap) ----------
    if table == "event_program":
        for r in rows:
            v = split_values(r)
            pid = to_int(v[ix["program_id"]]); eid = to_int(v[ix["event_id"]])
            prog2event[pid] = eid
            keep = eid in ON_EVENTS or bump(("prog", eid)) <= CAP_PROGRAM_OTHER
            if keep:
                program_kept.add(pid)
                d = ev_delta(eid)
                for dc in ("start_at", "end_at", "created_at"):
                    v[ix[dc]] = shift_dt(v[ix[dc]], d)
                # booth_id may reference a dropped booth -> null it to stay FK-safe
                bid = to_int(v[ix["booth_id"]])
                if bid is not None and bid not in booth_kept:
                    v[ix["booth_id"]] = "NULL"
                out.append(rebuild(v))
        return out

    # ---------- event_apply (per-event cap) ----------
    if table == "event_apply":
        for r in rows:
            v = split_values(r)
            aid = to_int(v[ix["apply_id"]]); eid = to_int(v[ix["event_id"]])
            apply2event[aid] = eid
            cap = CAP_APPLY_ON if eid in ON_EVENTS else CAP_APPLY_OTHER
            if bump(("apply", eid)) <= cap:
                apply_kept.add(aid)
                v[ix["applied_at"]] = shift_dt(v[ix["applied_at"]], ev_delta(eid))
                out.append(rebuild(v))
        return out

    # ---------- qr_codes (per-event cap) ----------
    if table == "qr_codes":
        for r in rows:
            v = split_values(r)
            qid = to_int(v[ix["qr_id"]]); eid = to_int(v[ix["event_id"]])
            qr2event[qid] = eid
            cap = CAP_QR_ON if eid in ON_EVENTS else CAP_QR_OTHER
            if bump(("qr", eid)) <= cap:
                qr_kept.add(qid)
                d = ev_delta(eid)
                v[ix["issued_at"]]  = shift_dt(v[ix["issued_at"]], d)
                v[ix["expired_at"]] = shift_dt(v[ix["expired_at"]], d)
                out.append(rebuild(v))
        return out

    # ---------- qr_logs (qr & booth must be kept; per-event cap) ----------
    if table == "qr_logs":
        for r in rows:
            v = split_values(r)
            qid = to_int(v[ix["qr_id"]]); bid = to_int(v[ix["booth_id"]])
            if qid not in qr_kept or bid not in booth_kept:
                continue
            eid = qr2event.get(qid)
            cap = CAP_QRLOG_ON if eid in ON_EVENTS else CAP_QRLOG_OTHER
            if bump(("qrlog", eid)) <= cap:
                v[ix["checked_at"]] = shift_dt(v[ix["checked_at"]], ev_delta(eid))
                out.append(rebuild(v))
        return out

    # ---------- program_speakers ----------
    if table == "program_speakers":
        for r in rows:
            v = split_values(r)
            pid = to_int(v[ix["program_id"]])
            if pid in program_kept:
                v[ix["created_at"]] = shift_dt(v[ix["created_at"]], ev_delta(prog2event.get(pid)))
                out.append(rebuild(v))
        return out

    # ---------- event_program_apply (per-program cap) ----------
    if table == "event_program_apply":
        for r in rows:
            v = split_values(r)
            pid = to_int(v[ix["program_id"]])
            if pid not in program_kept:
                continue
            eid = prog2event.get(pid)
            cap = CAP_PA_ON if eid in ON_EVENTS else CAP_PA_OTHER
            if bump(("pa", pid)) <= cap:
                d = ev_delta(eid)
                for dc in ("notified_at", "checked_in_at", "created_at", "cancelled_at"):
                    v[ix[dc]] = shift_dt(v[ix[dc]], d)
                out.append(rebuild(v))
        return out

    # ---------- booth_waits / experience_waits ----------
    if table == "booth_waits":
        for r in rows:
            v = split_values(r)
            bid = to_int(v[ix["booth_id"]])
            if bid in booth_kept:
                v[ix["updated_at"]] = shift_dt(v[ix["updated_at"]], ev_delta(booth2event.get(bid)))
                out.append(rebuild(v))
        return out
    if table == "experience_waits":
        for r in rows:
            v = split_values(r)
            pid = to_int(v[ix["program_id"]])
            if pid in program_kept:
                v[ix["updated_at"]] = shift_dt(v[ix["updated_at"]], ev_delta(prog2event.get(pid)))
                out.append(rebuild(v))
        return out

    # ---------- congestions (ON: all, others: cap) ----------
    if table == "congestions":
        for r in rows:
            v = split_values(r)
            pid = to_int(v[ix["program_id"]])
            if pid not in program_kept:
                continue
            eid = prog2event.get(pid)
            if eid in ON_EVENTS or bump(("cong", eid)) <= CAP_CONGEST_OTHER:
                v[ix["measured_at"]] = shift_dt(v[ix["measured_at"]], ev_delta(eid))
                out.append(rebuild(v))
        return out

    # ---------- reviews (per-event cap) ----------
    if table == "reviews":
        for r in rows:
            v = split_values(r)
            rid = to_int(v[ix["review_id"]]); eid = to_int(v[ix["event_id"]])
            rev2event[rid] = eid
            if bump(("rev", eid)) <= CAP_REVIEW:
                rev_kept.add(rid)
                d = ev_delta(eid)
                v[ix["created_at"]] = shift_dt(v[ix["created_at"]], d)
                v[ix["updated_at"]] = shift_dt(v[ix["updated_at"]], d)
                out.append(rebuild(v))
        return out
    if table == "review_comments":
        for r in rows:
            v = split_values(r)
            rid = to_int(v[ix["review_id"]])
            if rid not in rev_kept:
                continue
            if bump(("rcmt", rid)) <= CAP_RCMT:
                d = ev_delta(rev2event.get(rid))
                v[ix["created_at"]] = shift_dt(v[ix["created_at"]], d)
                v[ix["updated_at"]] = shift_dt(v[ix["updated_at"]], d)
                out.append(rebuild(v))
        return out

    # ---------- galleries (per-event cap) ----------
    if table == "galleries":
        for r in rows:
            v = split_values(r)
            gid = to_int(v[ix["gallery_id"]]); eid = to_int(v[ix["event_id"]])
            gal2event[gid] = eid
            cap = CAP_GALLERY_ON if eid in ON_EVENTS else CAP_GALLERY_OTHER
            if bump(("gal", eid)) <= cap:
                gal_kept.add(gid)
                d = ev_delta(eid)
                v[ix["created_at"]] = shift_dt(v[ix["created_at"]], d)
                v[ix["updated_at"]] = shift_dt(v[ix["updated_at"]], d)
                out.append(rebuild(v))
        return out
    if table == "gallery_images":
        # keep ALL images of kept galleries (so thumbnail_image_id stays valid)
        for r in rows:
            v = split_values(r)
            gid = to_int(v[ix["gallery_id"]])
            if gid in gal_kept:
                v[ix["created_at"]] = shift_dt(v[ix["created_at"]], ev_delta(gal2event.get(gid)))
                out.append(rebuild(v))
        return out
    if table == "gallery_likes":
        for r in rows:
            v = split_values(r)
            gid = to_int(v[ix["gallery_id"]])
            if gid not in gal_kept:
                continue
            if bump(("glike", gid)) <= CAP_GLIKE:
                v[ix["created_at"]] = shift_dt(v[ix["created_at"]], ev_delta(gal2event.get(gid)))
                out.append(rebuild(v))
        return out

    # ---------- payments / refunds ----------
    if table == "payments":
        for r in rows:
            v = split_values(r)
            aid = to_int(v[ix["event_apply_id"]])
            if aid not in apply_kept:
                continue
            pid = to_int(v[ix["payment_id"]])
            eid = to_int(v[ix["event_id"]])
            if eid is None:
                eid = apply2event.get(aid)
            pay2event[pid] = eid
            pay_kept.add(pid)
            v[ix["requested_at"]] = shift_dt(v[ix["requested_at"]], ev_delta(eid))
            out.append(rebuild(v))
        return out
    if table == "refunds":
        for r in rows:
            v = split_values(r)
            pid = to_int(v[ix["payment_id"]])
            if pid not in pay_kept:
                continue
            d = ev_delta(pay2event.get(pid))
            for dc in ("requested_at", "completed_at", "created_at", "updated_at"):
                v[ix[dc]] = shift_dt(v[ix[dc]], d)
            out.append(rebuild(v))
        return out

    # ---------- notification_inbox (global cap, target stays valid) ----------
    if table == "notification_inbox":
        for r in rows:
            v = split_values(r)
            if bump(("inbox",)) <= CAP_INBOX:
                out.append(rebuild(v))
        return out

    # ---------- fallback: unknown table -> keep verbatim ----------
    sys.stderr.write("WARN: passthrough unknown table %s\n" % table)
    out.extend("(" + r + ")" for r in rows)
    return out


def main():
    with open(SRC, "r", encoding="utf-8-sig") as f:
        lines = f.read().split("\n")

    out_lines = []
    counts = []  # (table, before, after)
    i, n = 0, len(lines)
    while i < n:
        line = lines[i]
        m = HEADER_RE.match(line.strip())
        if not m:
            out_lines.append(line); i += 1; continue
        table = m.group(1)
        cols = [c.strip().strip("`") for c in m.group(2).split(",")]
        # collect statement body
        j = i + 1
        in_str = False
        body = []
        while j < n:
            body.append(lines[j])
            in_str = scan_in_str(lines[j], in_str)
            if not in_str and lines[j].rstrip().endswith(";"):
                break
            j += 1
        values_text = "\n".join(body)
        rows = split_rows(values_text)
        kept = process(table, cols, rows)
        counts.append((table, len(rows), len(kept)))
        out_lines.append(line)  # header
        if kept:
            out_lines.append(",\n".join(kept) + ";")
        else:
            # keep statement valid even if everything trimmed (shouldn't happen)
            out_lines.append("-- (no rows after trim);")
        i = j + 1

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(out_lines))

    # report
    tot_b = sum(b for _, b, _ in counts)
    tot_a = sum(a for _, _, a in counts)
    print("table".ljust(28), "before".rjust(9), "after".rjust(9))
    print("-" * 50)
    for t, b, a in counts:
        print(t.ljust(28), str(b).rjust(9), str(a).rjust(9))
    print("-" * 50)
    print("TOTAL".ljust(28), str(tot_b).rjust(9), str(tot_a).rjust(9))
    print("\nevent deltas (days):", {k: delta[k] for k in sorted(delta)})


if __name__ == "__main__":
    main()
