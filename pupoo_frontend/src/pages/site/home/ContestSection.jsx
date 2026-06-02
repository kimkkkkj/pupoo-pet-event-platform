/**
 * ContestSection — 홈 콘테스트 섹션
 *
 * 3단계 자동 전환 (startAt/endAt 기준):
 *   now < startAt          → 신청기간  (참가신청 버튼)
 *   startAt <= now <= endAt → 투표기간  (실시간 투표 + 투표율)
 *   now > endAt            → 종료       (1등 결과 화면)
 *
 * 사용: Home.jsx에 <ContestSection /> 한 줄 추가
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../../../app/http/axiosInstance";
import { programApi } from "../../../app/http/programApi";
import {
  createImageFallbackHandler,
  resolveImageUrl,
} from "../../../shared/utils/publicAssetUrl";

/* ─── 상수 ─── */
const DOG_FALLBACK = [
  "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=400&fit=crop",
];
const fallbackImg = (id) =>
  DOG_FALLBACK[Math.abs(Number(id) || 0) % DOG_FALLBACK.length];

/* ─── 단계 판별 ─── */
function getPhase(startAt, endAt) {
  if (!startAt) return null;
  const now = new Date();
  const s = new Date(startAt);
  const e = endAt ? new Date(endAt) : null;
  if (e && now > e) return "ENDED";
  if (now >= s) return "VOTING";
  return "APPLYING";
}

/* ─── 날짜 포맷 ─── */
function fmt(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* ─── Toast ─── */
function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        left: "50%",
        transform: "translateX(-50%)",
        padding: "12px 24px",
        borderRadius: 12,
        background: type === "success" ? "#111" : "#B91C1C",
        color: "#fff",
        fontWeight: 700,
        fontSize: 14,
        boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
        zIndex: 9999,
        animation: "slideDown .3s ease",
      }}
    >
      {msg}
    </div>
  );
}

/* ─── 투표율 바 ─── */
function VoteBar({ pct, rank }) {
  const barColors = ["#F59E0B", "#9CA3AF", "#CD7C2E", "#8B5CF6"];
  return (
    <div style={{ marginTop: 8 }}>
      <div
        style={{
          height: 6,
          background: "#F3F4F6",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: barColors[Math.min(rank, 3)],
            borderRadius: 99,
            transition: "width 1s ease",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
          fontSize: 11,
          color: "#9CA3AF",
        }}
      >
        <span style={{ fontWeight: 700, color: barColors[Math.min(rank, 3)] }}>
          {pct.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

/* ─── 후보 카드 ─── */
function CandidateCard({
  candidate,
  rank,
  totalVotes,
  myVotedId,
  selected,
  onSelect,
  onVote,
  phase,
}) {
  const voteCount = candidate.voteCount ?? 0;
  const pct = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
  const isMyVote = myVotedId === candidate.programApplyId;
  const isSelected = selected === candidate.programApplyId;
  const medal = ["🥇", "🥈", "🥉"][rank] ?? null;

  return (
    <div
      onClick={() =>
        phase === "VOTING" && !myVotedId && onSelect(candidate.programApplyId)
      }
      style={{
        background: "#fff",
        borderRadius: 18,
        overflow: "hidden",
        border: isMyVote
          ? "2.5px solid #8B5CF6"
          : isSelected
            ? "2.5px solid #F59E0B"
            : "1.5px solid #F3F4F6",
        boxShadow: isSelected
          ? "0 8px 30px rgba(245,158,11,0.15)"
          : "0 2px 12px rgba(0,0,0,0.05)",
        cursor: phase === "VOTING" && !myVotedId ? "pointer" : "default",
        transition: "all 0.2s",
        transform: isSelected ? "translateY(-3px)" : "none",
        position: "relative",
      }}
    >
      {/* 순위 뱃지 */}
      {medal && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            zIndex: 2,
            background: "rgba(0,0,0,0.6)",
            borderRadius: 99,
            padding: "2px 8px",
            fontSize: 14,
            fontWeight: 800,
          }}
        >
          {medal}
        </div>
      )}
      {/* 내 투표 뱃지 */}
      {isMyVote && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 2,
            background: "#8B5CF6",
            color: "#fff",
            borderRadius: 99,
            padding: "2px 10px",
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          내 투표 ✓
        </div>
      )}

      {/* 사진 */}
      <div
        style={{
          width: "100%",
          paddingBottom: "85%",
          position: "relative",
          background: "#F9FAFB",
        }}
      >
        <img
          src={resolveImageUrl(candidate.imageUrl, fallbackImg(candidate.programApplyId))}
          alt={candidate.petName}
          onError={createImageFallbackHandler(fallbackImg(candidate.programApplyId))}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>

      {/* 정보 */}
      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: "#111827" }}>
          {candidate.petName || "이름 없음"}
        </div>
        {candidate.ownerNickname && (
          <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
            by {candidate.ownerNickname}
          </div>
        )}

        {(phase === "VOTING" || phase === "ENDED") && (
          <>
            <div
              style={{
                marginTop: 10,
                fontSize: 13,
                fontWeight: 700,
                color: "#374151",
              }}
            >
              {voteCount.toLocaleString()}표
            </div>
            <VoteBar pct={pct} rank={rank} />
          </>
        )}

        {/* 투표기간: 선택 표시 */}
        {phase === "VOTING" && !myVotedId && isSelected && (
          <div
            style={{
              marginTop: 10,
              textAlign: "center",
              padding: "6px 0",
              borderRadius: 8,
              background: "#FEF3C7",
              fontSize: 12,
              fontWeight: 700,
              color: "#D97706",
            }}
          >
            ✓ 선택됨
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── 메인 컴포넌트 ─── */
export default function ContestSection() {
  const navigate = useNavigate();

  const [contests, setContests] = useState([]); // [{program, phase, candidates, voteResult, myApply}]
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({}); // { programId: programApplyId }
  const [toast, setToast] = useState(null);
  const pollingRef = useRef(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
  }, []);

  /* ─── 로그인 여부 ─── */
  const isLoggedIn = () => {
    try {
      return !!(
        sessionStorage.getItem("accessToken") ||
        localStorage.getItem("accessToken") ||
        document.cookie.includes("refresh")
      );
    } catch {
      return false;
    }
  };

  /* ─── API 헬퍼 ─── */
  const unwrap = (res) => {
    const d = res?.data?.data ?? res?.data;
    return d;
  };
  const toList = (d) => {
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.content)) return d.content;
    if (Array.isArray(d?.items)) return d.items;
    return [];
  };

  /* ─── 초기 데이터 로드 ─── */
  const load = useCallback(async () => {
    try {
      // 1. 진행중 행사 목록
      const evRes = await axiosInstance.get("/api/events", {
        params: { status: "ONGOING", size: 20 },
      });
      const events = toList(unwrap(evRes));
      if (!events.length) {
        setLoading(false);
        return;
      }

      const result = [];

      for (const ev of events) {
        const eventId = ev.eventId ?? ev.id;
        try {
          // 2. 행사의 CONTEST 프로그램
          const pgRes = await programApi.getPrograms({
            eventId,
            category: "CONTEST",
            size: 10,
          });
          const programs = toList(unwrap(pgRes));

          for (const prog of programs) {
            const programId = prog.programId ?? prog.id;
            const phase = getPhase(prog.startAt, prog.endAt);
            if (!phase) continue;

            let candidates = [];
            let voteResult = null;
            let myApply = null;

            // 3. 후보(APPROVED 신청자)
            try {
              const cRes = await programApi.getCandidates(programId, {
                size: 50,
              });
              candidates = toList(unwrap(cRes));
            } catch {
              /* ignore */
            }

            // 4. 투표 결과 (투표기간 or 종료)
            if (phase === "VOTING" || phase === "ENDED") {
              try {
                const vRes = await programApi.getContestVoteResult(programId);
                voteResult = unwrap(vRes);
              } catch {
                /* ignore */
              }
            }

            // 5. 내 신청 (신청기간)
            if (phase === "APPLYING" && isLoggedIn()) {
              try {
                const aRes = await axiosInstance.get(
                  "/api/program-applies/my",
                  { params: { size: 200 } },
                );
                const myApplies = toList(unwrap(aRes));
                myApply =
                  myApplies.find(
                    (a) =>
                      String(a.programId) === String(programId) &&
                      a.status !== "CANCELLED",
                  ) ?? null;
              } catch {
                /* ignore */
              }
            }

            result.push({
              program: prog,
              programId,
              eventId,
              phase,
              candidates,
              voteResult,
              myApply,
            });
          }
        } catch {
          /* skip this event */
        }
      }

      setContests(result);
    } catch (e) {
      console.error("ContestSection load error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ─── 투표 결과만 재조회 (폴링) ─── */
  const refreshVoteResults = useCallback(async () => {
    setContests(
      (prev) => prev.map(async (c) => c), // 비동기 업데이트는 아래서 처리
    );

    setContests((prev) => {
      const next = [...prev];
      next.forEach(async (c, i) => {
        if (c.phase !== "VOTING") return;
        try {
          const vRes = await programApi.getContestVoteResult(c.programId);
          next[i] = {
            ...c,
            voteResult: vRes?.data?.data ?? vRes?.data ?? c.voteResult,
          };
          setContests([...next]);
        } catch {
          /* ignore */
        }
      });
      return prev; // 즉시 반환, 비동기로 업데이트됨
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ─── 투표기간 폴링 3초 ─── */
  useEffect(() => {
    const hasVoting = contests.some((c) => c.phase === "VOTING");
    if (hasVoting) {
      pollingRef.current = setInterval(refreshVoteResults, 3000);
    }
    return () => clearInterval(pollingRef.current);
  }, [contests, refreshVoteResults]);

  /* ─── 투표 ─── */
  const handleVote = useCallback(
    async (programId) => {
      if (!isLoggedIn()) {
        navigate("/auth/login");
        return;
      }
      const programApplyId = selected[programId];
      if (!programApplyId) {
        showToast("투표할 강아지를 먼저 선택해주세요!", "error");
        return;
      }
      try {
        await programApi.voteContest(programId, programApplyId);
        showToast("투표 완료! 🐾");

        // 투표 결과 즉시 갱신
        const vRes = await programApi.getContestVoteResult(programId);
        setContests((prev) =>
          prev.map((c) =>
            c.programId === programId
              ? {
                  ...c,
                  voteResult: vRes?.data?.data ?? vRes?.data ?? c.voteResult,
                }
              : c,
          ),
        );
        setSelected((s) => ({ ...s, [programId]: undefined }));
      } catch (e) {
        const code = e?.response?.data?.code;
        const msgMap = {
          CV4091: "이미 투표하셨어요! 한 번만 투표할 수 있답니다 🗳️",
          CV4002: "내 반려동물에게는 투표할 수 없어요 🐾",
          CV4003: "투표 기간이 아닙니다.",
        };
        showToast(
          msgMap[code] || e?.response?.data?.message || "투표 실패",
          "error",
        );
      }
    },
    [selected, navigate, showToast],
  );

  /* ─── 투표 취소 ─── */
  const handleCancelVote = useCallback(
    async (programId) => {
      try {
        await programApi.cancelContestVote(programId);
        showToast("투표가 취소됐습니다.");
        const vRes = await programApi.getContestVoteResult(programId);
        setContests((prev) =>
          prev.map((c) =>
            c.programId === programId
              ? {
                  ...c,
                  voteResult: vRes?.data?.data ?? vRes?.data ?? c.voteResult,
                }
              : c,
          ),
        );
      } catch (e) {
        showToast(e?.response?.data?.message || "취소 실패", "error");
      }
    },
    [showToast],
  );

  /* ─── 신청 ─── */
  const handleApply = useCallback(
    (programId) => {
      if (!isLoggedIn()) {
        navigate("/auth/login");
        return;
      }
      navigate(`/program/contest/apply?programId=${programId}`);
    },
    [navigate],
  );

  if (loading || contests.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes slideDown{from{opacity:0;transform:translate(-50%,-12px)}to{opacity:1;transform:translate(-50%,0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .cs-card{animation:fadeUp .5s ease both;}
        .cs-candidate:hover{transform:translateY(-4px)!important; box-shadow:0 12px 36px rgba(0,0,0,0.1)!important;}
        .cs-vote-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 24px rgba(139,92,246,0.35);}
        .cs-apply-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 24px rgba(245,158,11,0.35);}
        @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.3)}}
        .live-dot{animation:pulse-dot 1.4s infinite;}
      `}</style>

      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

      {contests.map((c) => {
        const { program, programId, phase, candidates, voteResult, myApply } =
          c;

        // 투표 결과 데이터 파싱
        const voteItems = voteResult?.results ?? voteResult?.items ?? [];
        const totalVotes =
          voteResult?.totalVotes ??
          voteItems.reduce((s, v) => s + (v.voteCount ?? 0), 0);
        const myVotedId = voteResult?.myProgramApplyId ?? null;

        // 후보에 득표수 병합
        const enriched = candidates
          .map((cand) => {
            const vItem = voteItems.find(
              (v) => v.programApplyId === cand.programApplyId,
            );
            return { ...cand, voteCount: vItem?.voteCount ?? 0 };
          })
          .sort((a, b) => b.voteCount - a.voteCount);

        // 종료 시 1등
        const winner =
          phase === "ENDED" && enriched.length > 0 ? enriched[0] : null;

        return (
          <section
            key={programId}
            className="cs-card"
            style={{
              background:
                phase === "ENDED"
                  ? "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)"
                  : phase === "VOTING"
                    ? "linear-gradient(135deg, #1e0533 0%, #2d0555 50%, #4c0680 100%)"
                    : "linear-gradient(135deg, #1a1209 0%, #2d1f07 50%, #3d2a0a 100%)",
              padding: "80px 0",
            }}
          >
            <div
              style={{ maxWidth: 1400, margin: "0 auto", padding: "0 20px" }}
            >
              {/* ── 헤더 ── */}
              <div
                style={{
                  marginBottom: 48,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 16,
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 10,
                    }}
                  >
                    {phase === "VOTING" && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          background: "rgba(239,68,68,0.15)",
                          border: "1px solid rgba(239,68,68,0.4)",
                          borderRadius: 99,
                          padding: "4px 12px",
                        }}
                      >
                        <div
                          className="live-dot"
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: "#EF4444",
                          }}
                        />
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: "#EF4444",
                            letterSpacing: 1,
                          }}
                        >
                          LIVE
                        </span>
                      </div>
                    )}
                    {phase === "APPLYING" && (
                      <div
                        style={{
                          background: "rgba(245,158,11,0.15)",
                          border: "1px solid rgba(245,158,11,0.4)",
                          borderRadius: 99,
                          padding: "4px 12px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: "#F59E0B",
                          }}
                        >
                          🐾 신청 접수 중
                        </span>
                      </div>
                    )}
                    {phase === "ENDED" && (
                      <div
                        style={{
                          background: "rgba(251,191,36,0.15)",
                          border: "1px solid rgba(251,191,36,0.4)",
                          borderRadius: 99,
                          padding: "4px 12px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: "#FBB]24",
                          }}
                        >
                          🏆 투표 종료
                        </span>
                      </div>
                    )}
                  </div>

                  <h2
                    style={{
                      fontSize: 32,
                      fontWeight: 900,
                      color: "#fff",
                      margin: "0 0 8px",
                      letterSpacing: -0.5,
                    }}
                  >
                    {program.programTitle}
                  </h2>
                  <p
                    style={{
                      fontSize: 14,
                      color: "rgba(255,255,255,0.55)",
                      margin: 0,
                    }}
                  >
                    {phase === "VOTING"
                      ? `투표 마감: ${fmt(program.endAt)} · 총 ${totalVotes.toLocaleString()}표`
                      : phase === "APPLYING"
                        ? `신청 가능 · 투표 시작: ${fmt(program.startAt)}`
                        : `최종 ${totalVotes.toLocaleString()}표 집계`}
                  </p>
                </div>

                {/* 신청기간: 신청 버튼 */}
                {phase === "APPLYING" && (
                  <div>
                    {myApply ? (
                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            padding: "10px 20px",
                            borderRadius: 12,
                            background: "rgba(255,255,255,0.08)",
                            border: "1px solid rgba(255,255,255,0.15)",
                            color: "rgba(255,255,255,0.7)",
                            fontSize: 13,
                            fontWeight: 600,
                            marginBottom: 8,
                          }}
                        >
                          신청 완료 (
                          {myApply.status === "APPLIED"
                            ? "검토 중"
                            : myApply.status === "APPROVED"
                              ? "승인됨 ✅"
                              : myApply.status}
                          )
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "rgba(255,255,255,0.4)",
                            textAlign: "center",
                          }}
                        >
                          투표 시작 후 결과를 확인하세요
                        </div>
                      </div>
                    ) : (
                      <button
                        className="cs-apply-btn"
                        onClick={() => handleApply(programId)}
                        style={{
                          padding: "14px 28px",
                          borderRadius: 14,
                          border: "none",
                          background: "linear-gradient(135deg,#F59E0B,#D97706)",
                          color: "#fff",
                          fontWeight: 800,
                          fontSize: 15,
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        🐾 우리 강아지 참가신청
                      </button>
                    )}
                  </div>
                )}

                {/* 투표기간: 투표 버튼 */}
                {phase === "VOTING" && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      alignItems: "flex-end",
                    }}
                  >
                    {myVotedId ? (
                      <>
                        <div
                          style={{
                            padding: "10px 20px",
                            borderRadius: 12,
                            background: "rgba(139,92,246,0.2)",
                            border: "1px solid rgba(139,92,246,0.4)",
                            color: "#C4B5FD",
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          ✓ 투표 완료
                        </div>
                        <button
                          onClick={() => handleCancelVote(programId)}
                          style={{
                            fontSize: 12,
                            color: "rgba(255,255,255,0.4)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          투표 취소
                        </button>
                      </>
                    ) : (
                      <button
                        className="cs-vote-btn"
                        onClick={() => handleVote(programId)}
                        disabled={!selected[programId]}
                        style={{
                          padding: "14px 28px",
                          borderRadius: 14,
                          border: "none",
                          background: selected[programId]
                            ? "linear-gradient(135deg,#8B5CF6,#6D28D9)"
                            : "rgba(255,255,255,0.1)",
                          color: selected[programId]
                            ? "#fff"
                            : "rgba(255,255,255,0.3)",
                          fontWeight: 800,
                          fontSize: 15,
                          cursor: selected[programId]
                            ? "pointer"
                            : "not-allowed",
                          transition: "all 0.2s",
                        }}
                      >
                        {selected[programId]
                          ? "🗳️ 투표하기"
                          : "강아지를 선택하세요"}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ── 종료: 1등 결과 ── */}
              {phase === "ENDED" && winner && (
                <div
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.06))",
                    border: "1px solid rgba(251,191,36,0.25)",
                    borderRadius: 24,
                    padding: "36px 40px",
                    marginBottom: 40,
                    display: "flex",
                    alignItems: "center",
                    gap: 36,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontSize: 72, lineHeight: 1 }}>🏆</div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#F59E0B",
                        letterSpacing: 2,
                        marginBottom: 8,
                      }}
                    >
                      WINNER
                    </div>
                    <div
                      style={{
                        fontSize: 36,
                        fontWeight: 900,
                        color: "#FBB924",
                      }}
                    >
                      {winner.petName}
                    </div>
                    {winner.ownerNickname && (
                      <div
                        style={{
                          fontSize: 14,
                          color: "rgba(255,255,255,0.5)",
                          marginTop: 4,
                        }}
                      >
                        by {winner.ownerNickname}
                      </div>
                    )}
                    <div
                      style={{
                        marginTop: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 900,
                          color: "#FBB924",
                        }}
                      >
                        {winner.voteCount.toLocaleString()}표
                      </div>
                      <div
                        style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}
                      >
                        (
                        {totalVotes > 0
                          ? ((winner.voteCount / totalVotes) * 100).toFixed(1)
                          : 0}
                        %)
                      </div>
                    </div>
                  </div>
                  {winner.imageUrl && (
                    <div
                      style={{
                        width: 140,
                        height: 140,
                        borderRadius: 20,
                        overflow: "hidden",
                        border: "3px solid rgba(251,191,36,0.5)",
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={resolveImageUrl(winner.imageUrl, fallbackImg(winner.programApplyId))}
                        alt={winner.petName}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                        onError={createImageFallbackHandler(fallbackImg(winner.programApplyId))}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ── 후보 그리드 ── */}
              {enriched.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: 18,
                  }}
                >
                  {enriched.map((cand, idx) => (
                    <div
                      key={cand.programApplyId}
                      className="cs-candidate"
                      style={{ transition: "all 0.2s" }}
                    >
                      <CandidateCard
                        candidate={cand}
                        rank={idx}
                        totalVotes={totalVotes}
                        myVotedId={myVotedId}
                        selected={selected[programId]}
                        onSelect={(id) =>
                          !myVotedId &&
                          setSelected((s) => ({ ...s, [programId]: id }))
                        }
                        onVote={() => handleVote(programId)}
                        phase={phase}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 0",
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 20,
                    border: "1px dashed rgba(255,255,255,0.12)",
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🐾</div>
                  <div
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 15,
                      fontWeight: 600,
                    }}
                  >
                    {phase === "APPLYING"
                      ? "아직 신청자가 없습니다. 첫 번째로 신청해보세요!"
                      : "등록된 후보가 없습니다."}
                  </div>
                </div>
              )}

              {/* ── 투표기간: 하단 안내 ── */}
              {phase === "VOTING" && !myVotedId && (
                <div
                  style={{
                    textAlign: "center",
                    marginTop: 32,
                    color: "rgba(255,255,255,0.35)",
                    fontSize: 13,
                  }}
                >
                  카드를 클릭해서 투표할 강아지를 선택하세요 · 1인 1회 투표 가능
                </div>
              )}
            </div>
          </section>
        );
      })}
    </>
  );
}
