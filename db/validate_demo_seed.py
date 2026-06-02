# -*- coding: utf-8 -*-
"""Static integrity check of pupoo_seed_demo.sql.

Simulates the constraints MySQL would enforce on import:
  - FK references (incl. nullable + loose notification_inbox.target_id)
  - key UNIQUE constraints
  - key CHECK constraints
  - event status vs. date logic (matches EventService.resolvePublicStatus)
Exits non-zero if any violation is found.
"""
import re
import sys
from datetime import datetime

OUT = "pupoo_seed_demo.sql"
TODAY = datetime(2026, 6, 2).date()

# reuse tokenizers ------------------------------------------------------
def split_rows(text):
    rows, buf = [], []
    depth = 0; in_str = False; started = False
    i, n = 0, len(text)
    while i < n:
        c = text[i]
        if in_str:
            buf.append(c)
            if c == "\\" and i + 1 < n:
                buf.append(text[i+1]); i += 2; continue
            if c == "'":
                if i + 1 < n and text[i+1] == "'":
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
        if started: buf.append(c)
        i += 1
    return rows

def split_values(inner):
    vals, buf = [], []; in_str = False; i, n = 0, len(inner)
    while i < n:
        c = inner[i]
        if in_str:
            buf.append(c)
            if c == "\\" and i + 1 < n:
                buf.append(inner[i+1]); i += 2; continue
            if c == "'":
                if i + 1 < n and inner[i+1] == "'":
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
    if t in ("NULL", ""): return None
    if t[0] == "'" and t[-1] == "'": t = t[1:-1]
    try: return int(t)
    except ValueError: return None

def unq(tok):
    t = tok.strip()
    if t == "NULL": return None
    if len(t) >= 2 and t[0] == "'" and t[-1] == "'": return t[1:-1]
    return t

HEADER_RE = re.compile(r"^INSERT INTO\s+`?(\w+)`?\s*\((.*)\)\s*VALUES\s*$")

def scan_in_str(line, in_str):
    i, n = 0, len(line)
    while i < n:
        c = line[i]
        if in_str:
            if c == "\\": i += 2; continue
            if c == "'":
                if i + 1 < n and line[i+1] == "'": i += 2; continue
                in_str = False
            i += 1; continue
        if c == "'": in_str = True
        i += 1
    return in_str

def load(path):
    with open(path, "r", encoding="utf-8") as f:
        lines = f.read().split("\n")
    tables = {}  # name -> (cols, [value-lists])
    i, n = 0, len(lines)
    while i < n:
        m = HEADER_RE.match(lines[i].strip())
        if not m:
            i += 1; continue
        table = m.group(1)
        cols = [c.strip().strip("`") for c in m.group(2).split(",")]
        j = i + 1; in_str = False; body = []
        while j < n:
            body.append(lines[j])
            in_str = scan_in_str(lines[j], in_str)
            if not in_str and lines[j].rstrip().endswith(";"):
                break
            j += 1
        rows = [split_values(r) for r in split_rows("\n".join(body))]
        tables[table] = ({c: k for k, c in enumerate(cols)}, rows)
        i = j + 1
    return tables

def main():
    T = load(OUT)
    errors = []
    def pk_set(table, col):
        ix, rows = T[table]
        return {to_int(r[ix[col]]) for r in rows}

    PK = {
        "users": pk_set("users", "user_id"),
        "interests": pk_set("interests", "interest_id"),
        "event": pk_set("event", "event_id"),
        "booths": pk_set("booths", "booth_id"),
        "event_program": pk_set("event_program", "program_id"),
        "event_apply": pk_set("event_apply", "apply_id"),
        "qr_codes": pk_set("qr_codes", "qr_id"),
        "galleries": pk_set("galleries", "gallery_id"),
        "gallery_images": pk_set("gallery_images", "image_id"),
        "reviews": pk_set("reviews", "review_id"),
        "payments": pk_set("payments", "payment_id"),
        "posts": pk_set("posts", "post_id"),
        "notification": pk_set("notification", "notification_id"),
        "notices": pk_set("notices", "notice_id"),
        "speakers": pk_set("speakers", "speaker_id"),
        "pet": pk_set("pet", "pet_id"),
        "boards": pk_set("boards", "board_id"),
    }

    # (child table, child col, parent table, nullable)
    FKS = [
        ("pet", "user_id", "users", False),
        ("user_interest_subscriptions", "user_id", "users", False),
        ("user_interest_subscriptions", "interest_id", "interests", False),
        ("event_images", "event_id", "event", False),
        ("event_images", "created_by_admin_id", "users", True),
        ("booths", "event_id", "event", False),
        ("event_congestion_policy", "event_id", "event", False),
        ("event_interest_map", "event_id", "event", False),
        ("event_interest_map", "interest_id", "interests", False),
        ("event_apply", "user_id", "users", False),
        ("event_apply", "event_id", "event", False),
        ("qr_codes", "user_id", "users", False),
        ("qr_codes", "event_id", "event", False),
        ("qr_logs", "qr_id", "qr_codes", False),
        ("qr_logs", "booth_id", "booths", False),
        ("event_program", "event_id", "event", False),
        ("event_program", "booth_id", "booths", True),
        ("program_speakers", "program_id", "event_program", False),
        ("program_speakers", "speaker_id", "speakers", False),
        ("event_program_apply", "program_id", "event_program", False),
        ("event_program_apply", "user_id", "users", True),
        ("event_program_apply", "pet_id", "pet", True),
        ("booth_waits", "booth_id", "booths", False),
        ("experience_waits", "program_id", "event_program", False),
        ("congestions", "program_id", "event_program", False),
        ("posts", "board_id", "boards", False),
        ("posts", "user_id", "users", False),
        ("post_comments", "post_id", "posts", False),
        ("post_comments", "user_id", "users", False),
        ("notices", "event_id", "event", True),
        ("notices", "created_by_admin_id", "users", False),
        ("reviews", "event_id", "event", False),
        ("reviews", "user_id", "users", False),
        ("review_comments", "review_id", "reviews", False),
        ("review_comments", "user_id", "users", False),
        ("galleries", "event_id", "event", False),
        ("galleries", "user_id", "users", False),
        ("galleries", "thumbnail_image_id", "gallery_images", True),
        ("gallery_images", "gallery_id", "galleries", False),
        ("gallery_likes", "gallery_id", "galleries", False),
        ("gallery_likes", "user_id", "users", False),
        ("payments", "user_id", "users", False),
        ("payments", "event_id", "event", True),
        ("payments", "event_apply_id", "event_apply", False),
        ("refunds", "payment_id", "payments", False),
        ("notification_send", "notification_id", "notification", False),
        ("notification_send", "sender_id", "users", False),
        ("notification_inbox", "user_id", "users", False),
        ("notification_inbox", "notification_id", "notification", False),
        ("notification_settings", "user_id", "users", False),
    ]
    parent_pk_col = {
        "event_apply": "apply_id", "qr_codes": "qr_id", "event_program": "program_id",
        "galleries": "gallery_id", "gallery_images": "image_id", "reviews": "review_id",
        "payments": "payment_id",
    }
    for ctab, ccol, ptab, nullable in FKS:
        if ctab not in T:
            continue
        ix, rows = T[ctab]
        pset = PK[ptab]
        bad = 0
        for r in rows:
            val = to_int(r[ix[ccol]])
            if val is None:
                if not nullable:
                    bad += 1
                continue
            if val not in pset:
                bad += 1
        tag = "FK %s.%s -> %s" % (ctab, ccol, ptab)
        if bad:
            errors.append("%s : %d dangling" % (tag, bad))
        print(("  OK  " if not bad else " FAIL ") + tag + (" (%d)" % bad if bad else ""))

    # loose notification_inbox.target_id
    ix, rows = T["notification_inbox"]
    bad = 0
    for r in rows:
        tt = unq(r[ix["target_type"]]); tid = to_int(r[ix["target_id"]])
        if tt is None or tid is None:
            continue
        if tt == "EVENT" and tid not in PK["event"]: bad += 1
        elif tt == "NOTICE" and tid not in PK["notices"]: bad += 1
    print(("  OK  " if not bad else " FAIL ") + "loose notification_inbox.target_id" + (" (%d)" % bad if bad else ""))
    if bad: errors.append("notification_inbox.target_id : %d dangling" % bad)

    # UNIQUE: payments.order_no
    ix, rows = T["payments"]
    ons = [unq(r[ix["order_no"]]) for r in rows]
    if len(ons) != len(set(ons)):
        errors.append("UNIQUE payments.order_no violated")
    print(("  OK  " if len(ons) == len(set(ons)) else " FAIL ") + "UNIQUE payments.order_no")

    # UNIQUE: reviews(event_id,user_id)
    ix, rows = T["reviews"]
    pairs = [(to_int(r[ix["event_id"]]), to_int(r[ix["user_id"]])) for r in rows]
    dup = len(pairs) != len(set(pairs))
    if dup: errors.append("UNIQUE reviews(event_id,user_id) violated")
    print(("  OK  " if not dup else " FAIL ") + "UNIQUE reviews(event_id,user_id)")

    # UNIQUE: qr_codes(user_id,event_id)
    ix, rows = T["qr_codes"]
    pairs = [(to_int(r[ix["user_id"]]), to_int(r[ix["event_id"]])) for r in rows]
    dup = len(pairs) != len(set(pairs))
    if dup: errors.append("UNIQUE qr_codes(user_id,event_id) violated")
    print(("  OK  " if not dup else " FAIL ") + "UNIQUE qr_codes(user_id,event_id)")

    # UNIQUE: event_apply active (event_id,user_id) for APPLIED/APPROVED
    ix, rows = T["event_apply"]
    act = [(to_int(r[ix["event_id"]]), to_int(r[ix["user_id"]])) for r in rows
           if unq(r[ix["status"]]) in ("APPLIED", "APPROVED")]
    dup = len(act) != len(set(act))
    if dup: errors.append("UNIQUE event_apply active(event_id,user_id) violated")
    print(("  OK  " if not dup else " FAIL ") + "UNIQUE event_apply active(event_id,user_id)")

    # CHECK: event end>start ; event_program end>start
    for tab in ("event", "event_program"):
        ix, rows = T[tab]
        bad = 0
        for r in rows:
            s = datetime.strptime(unq(r[ix["start_at"]]), "%Y-%m-%d %H:%M:%S")
            e = datetime.strptime(unq(r[ix["end_at"]]), "%Y-%m-%d %H:%M:%S")
            if not e > s: bad += 1
        if bad: errors.append("CHECK %s end>start : %d" % (tab, bad))
        print(("  OK  " if not bad else " FAIL ") + "CHECK %s end_at>start_at" % tab + (" (%d)" % bad if bad else ""))

    # CHECK: reviews rating 1..5
    ix, rows = T["reviews"]
    bad = sum(1 for r in rows if not (1 <= to_int(r[ix["rating"]]) <= 5))
    if bad: errors.append("CHECK reviews.rating : %d" % bad)
    print(("  OK  " if not bad else " FAIL ") + "CHECK reviews.rating 1..5" + (" (%d)" % bad if bad else ""))

    # event status vs date logic + distribution
    ix, rows = T["event"]
    dist = {"PLANNED": 0, "ONGOING": 0, "ENDED": 0, "CANCELLED": 0}
    mismatch = 0
    for r in rows:
        st = unq(r[ix["status"]])
        sd = datetime.strptime(unq(r[ix["start_at"]]), "%Y-%m-%d %H:%M:%S").date()
        ed = datetime.strptime(unq(r[ix["end_at"]]), "%Y-%m-%d %H:%M:%S").date()
        if sd > TODAY: expect = "PLANNED"
        elif ed < TODAY: expect = "ENDED"
        else: expect = "ONGOING"
        if st != expect: mismatch += 1
        dist[st] += 1
    if mismatch: errors.append("event status != date-derived : %d" % mismatch)
    print(("  OK  " if not mismatch else " FAIL ") +
          "event status matches date logic" + (" (%d)" % mismatch if mismatch else ""))
    print("       distribution:", dist)

    print("\n" + ("ALL CHECKS PASSED" if not errors else "VIOLATIONS:\n  - " + "\n  - ".join(errors)))
    sys.exit(1 if errors else 0)

if __name__ == "__main__":
    main()
