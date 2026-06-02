import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { programApi } from "../../../../app/http/programApi";

export default function ContestVote() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const programId = searchParams.get("programId");

  const [loading, setLoading] = useState(false);

  const [voting, setVoting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // ✅ 토스트
  const [toast, setToast] = useState(null); // { message, type }
  const toastTimerRef = useRef(null);

  // ✅ 후보(승인된 신청자) 원본
  const [candidateBase, setCandidateBase] = useState([]); // ProgramApplyResponse[]
  const [candidateLoading, setCandidateLoading] = useState(false);

  // ✅ 득표 집계 원본 (result.items)
  const [voteItems, setVoteItems] = useState([]); // [{programApplyId, voteCount}]
  const [totalVotes, setTotalVotes] = useState(0);
  const [myVotedApplyId, setMyVotedApplyId] = useState(null);

  // 선택된 후보
  const [selectedApplyId, setSelectedApplyId] = useState(null);

  // ✅ 401 팝업 2번 방지
  const didHandle401Ref = useRef(false);

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  };

  const handle401 = () => {
    if (didHandle401Ref.current) return;
    didHandle401Ref.current = true;

    showToast("로그인이 필요합니다.", "error");
    const from = `${location.pathname}${location.search}`;
    navigate("/auth/login", { state: { from } });
  };

  const normalizeData = (res) => res?.data?.data ?? res?.data;

  const extractList = (res) => {
    const data = normalizeData(res);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.candidates)) return data.candidates;
    return [];
  };

  // 후보 표시명(현재 백엔드는 ProgramApplyResponse라 petName 같은 건 없음)
  const getCandidateTitle = (c) => `후보 ${c.programApplyId}`;

  // ✅ 후보 + 득표 join 결과
  const mergedCandidates = useMemo(() => {
    const countMap = new Map(
      (voteItems || []).map((x) => [
        Number(x.programApplyId),
        Number(x.voteCount || 0),
      ]),
    );

    return (candidateBase || []).map((c) => ({
      ...c,
      voteCount: countMap.get(Number(c.programApplyId)) ?? 0,
    }));
  }, [candidateBase, voteItems]);

  // 선택값이 후보 목록에 없는 경우 해제
  useEffect(() => {
    if (selectedApplyId == null) return;
    const exists = mergedCandidates.some(
      (x) => String(x.programApplyId) === String(selectedApplyId),
    );
    if (!exists) setSelectedApplyId(null);
  }, [mergedCandidates, selectedApplyId]);

  const fetchCandidatesOnce = async () => {
    if (!programId) return;

    setCandidateLoading(true);
    try {
      const res = await programApi.getCandidates(programId, {
        page: 0,
        size: 200,
      });
      const list = extractList(res);

      // 백엔드가 이미 APPROVED만 내리지만, 방어로 한번 더 필터
      const approvedOnly = list.filter(
        (c) => String(c?.status ?? "").toUpperCase() === "APPROVED",
      );

      setCandidateBase(approvedOnly);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401) return handle401();

      setCandidateBase([]);
      const msg =
        e?.response?.data?.error?.message ||
        e?.response?.data?.message ||
        e?.message ||
        "후보 목록 조회 실패";
      showToast(msg, "error");
    } finally {
      setCandidateLoading(false);
    }
  };

  const fetchVoteResult = async ({ silent = false } = {}) => {
    if (!programId) return;

    try {
      const res = await programApi.getContestVoteResult(programId);
      const data = normalizeData(res);

      // ContestVoteResultResponse 가정:
      // { programId, total, items:[{programApplyId,voteCount}], myProgramApplyId }
      setTotalVotes(Number(data?.total ?? 0));
      setVoteItems(Array.isArray(data?.items) ? data.items : []);
      setMyVotedApplyId(data?.myProgramApplyId ?? null);

      if (!silent) {
        // 성공 시엔 토스트 안 띄움(필요하면 여기서 showToast 가능)
      }
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401) return handle401();

      if (!silent) {
        const msg =
          e?.response?.data?.error?.message ||
          e?.response?.data?.message ||
          e?.message ||
          "투표 현황 조회 실패";
        showToast(msg, "error");
      }
    }
  };

  useEffect(() => {
    if (!programId) {
      showToast("programId가 없습니다.", "error");
      return;
    }

    let timerId = null;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        // 1) 후보 1회 로드
        await fetchCandidatesOnce();

        // 2) 득표 결과 로드
        await fetchVoteResult();

        // 3) 득표 결과만 3초 폴링
        timerId = setInterval(async () => {
          if (cancelled) return;
          await fetchVoteResult({ silent: true });
        }, 3000);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (timerId) clearInterval(timerId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  const onVote = async () => {
    if (!selectedApplyId) {
      showToast("투표할 후보를 선택하세요.", "error");
      return;
    }

    try {
      setVoting(true);

      await programApi.voteContest(programId, Number(selectedApplyId));
      showToast("투표가 완료되었습니다.", "success");

      await fetchVoteResult(); // 즉시 반영
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401) return handle401();

      const error = e?.response?.data?.error;

      let msg = "투표 실패";
      if (error?.code === "CV4091") msg = "이미 투표를 했습니다.";
      else if (error?.code === "CV4002")
        msg = "내 반려동물에게는 투표할 수 없어요 🐾";
      else if (error?.code === "CV4003") msg = "투표 기간이 아닙니다.";
      else if (error?.message) msg = error.message;

      showToast(msg, "error");
    } finally {
      setVoting(false);
    }
  };

  const onCancelVote = async () => {
    try {
      setCancelling(true);

      await programApi.cancelContestVote(programId);
      showToast("투표가 취소되었습니다.", "success");

      await fetchVoteResult();
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401) return handle401();

      const error = e?.response?.data?.error;
      let msg = "투표 취소 실패";
      if (error?.code === "CV4041") msg = "취소할 투표가 없습니다.";
      else if (error?.code === "CV4003") msg = "투표 기간이 아닙니다.";
      else if (error?.message) msg = error.message;

      showToast(msg, "error");
    } finally {
      setCancelling(false);
    }
  };

  const pageTitle = useMemo(() => "실시간 투표", []);

  if (!programId) {
    return (
      <div style={{ padding: 16 }}>
        <h2>{pageTitle}</h2>
        <div style={{ color: "red" }}>programId가 없습니다.</div>
      </div>
    );
  }

  const showEmpty =
    !loading && !candidateLoading && mergedCandidates.length === 0;

  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => navigate(-1)}>뒤로</button>
      <h2 style={{ marginTop: 12 }}>{pageTitle}</h2>
      <div style={{ opacity: 0.6, marginBottom: 12 }}>
        programId: {programId}
      </div>

      {loading || candidateLoading ? (
        <div>불러오는 중...</div>
      ) : showEmpty ? (
        <div>
          <div style={{ marginBottom: 8 }}>현재 투표 후보가 없습니다.</div>
          <div style={{ opacity: 0.6, fontSize: 13 }}>
            (APPROVED 후보가 있어야 표시됩니다)
          </div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 10, opacity: 0.7 }}>
            총 투표수: <b>{totalVotes}</b>
            {myVotedApplyId ? (
              <span style={{ marginLeft: 10 }}>
                내 투표: <b>{myVotedApplyId}</b>
              </span>
            ) : null}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {mergedCandidates
              .slice()
              .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))
              .map((c) => {
                const key = c.programApplyId;
                const checked = String(selectedApplyId) === String(key);

                return (
                  <label
                    key={String(key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      border: "1px solid #ddd",
                      borderRadius: 10,
                      padding: "10px 12px",
                      cursor: "pointer",
                      background:
                        String(myVotedApplyId) === String(key)
                          ? "#f5fff5"
                          : "#fff",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <input
                        type="radio"
                        name="candidate"
                        checked={checked}
                        onChange={() => setSelectedApplyId(key)}
                      />
                      <div>
                        <div style={{ fontWeight: 700 }}>
                          {getCandidateTitle(c)}
                        </div>
                        <div style={{ opacity: 0.7, fontSize: 13 }}>
                          후보ID: {String(key)} / userId: {c.userId}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontWeight: 700 }}>
                      {c.voteCount}
                      <span style={{ fontWeight: 400, opacity: 0.7 }}> 표</span>
                    </div>
                  </label>
                );
              })}
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={onVote}
              disabled={voting}
              style={styles.primaryBtn}
              title={!selectedApplyId ? "후보를 선택하세요" : ""}
            >
              {voting ? "투표 중..." : "투표하기"}
            </button>

            <button
              onClick={onCancelVote}
              disabled={cancelling}
              style={styles.secondaryBtn}
            >
              {cancelling ? "취소 중..." : "투표 취소"}
            </button>

            <button
              onClick={async () => {
                await fetchCandidatesOnce();
                await fetchVoteResult();
                showToast("새로고침 완료", "success");
              }}
              style={styles.ghostBtn}
            >
              새로고침
            </button>
          </div>
        </>
      )}

      {/* ✅ 토스트 UI */}
      {toast && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            top: 80,
            transform: "translateX(-50%)",
            padding: "12px 16px",
            borderRadius: 10,
            background: toast.type === "success" ? "#1f2937" : "#b91c1c",
            color: "#fff",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            zIndex: 9999,
            maxWidth: "90vw",
            whiteSpace: "pre-wrap",
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

const styles = {
  primaryBtn: {
    padding: "10px 16px",
    borderRadius: 8,
    backgroundColor: "#222",
    color: "#fff",
    border: "none",
    cursor: "pointer",
  },
  secondaryBtn: {
    padding: "10px 16px",
    borderRadius: 8,
    backgroundColor: "#eee",
    border: "1px solid #ccc",
    cursor: "pointer",
  },
  ghostBtn: {
    padding: "10px 16px",
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    border: "1px solid #ddd",
    cursor: "pointer",
  },
};
