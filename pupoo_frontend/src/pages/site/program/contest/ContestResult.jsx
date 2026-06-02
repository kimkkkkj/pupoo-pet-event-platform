import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { programApi } from "../../../../app/http/programApi";

export default function ContestResult() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const programId = searchParams.get("programId");

  const [loading, setLoading] = useState(false);
  const [errorObj, setErrorObj] = useState(null);

  const [resultRaw, setResultRaw] = useState(null);
  const [candidates, setCandidates] = useState([]);

  // ----- helpers -----
  const normalizeData = (res) => res?.data?.data ?? res?.data;

  const extractCandidates = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.candidates)) return data.candidates;
    return [];
  };

  const getCandidateKey = (c) =>
    c?.programApplyId ?? c?.applyId ?? c?.id ?? c?.program_apply_id ?? null;

  const getCandidateTitle = (c) =>
    c?.petName ||
    c?.pet_name ||
    c?.userName ||
    c?.user_name ||
    c?.nickname ||
    c?.name ||
    `후보 ${getCandidateKey(c)}`;

  const getVoteCount = (c) =>
    Number(c?.voteCount ?? c?.vote_count ?? c?.count ?? c?.totalVotes ?? 0);

  const parseErrorMessage = (e) => {
    const status = e?.response?.status;
    const data = e?.response?.data;

    // message가 객체면 string으로 변환
    const rawMsg =
      data?.message ??
      data?.error ??
      (typeof data === "string" ? data : null) ??
      e?.message ??
      "요청 실패";

    const msg =
      typeof rawMsg === "object" ? JSON.stringify(rawMsg) : String(rawMsg);

    return { status, msg };
  };

  // ----- 투표 상태 판별(응답 필드가 있으면 그걸 사용) -----
  const votePhase = useMemo(() => {
    // 가능한 필드 후보들(백엔드 응답에 따라 택1)
    const d = resultRaw;
    const status =
      d?.voteStatus ?? d?.status ?? d?.phase ?? d?.votingStatus ?? null;

    // 흔한 케이스들 대응
    const s = status ? String(status).toUpperCase() : "";

    if (["ENDED", "CLOSED", "FINISHED", "DONE", "RESULT"].includes(s))
      return "RESULT";
    if (["ONGOING", "OPEN", "LIVE", "IN_PROGRESS", "VOTING"].includes(s))
      return "LIVE";

    // boolean 형태
    if (typeof d?.isVotingOpen === "boolean")
      return d.isVotingOpen ? "LIVE" : "RESULT";
    if (typeof d?.votingOpen === "boolean")
      return d.votingOpen ? "LIVE" : "RESULT";

    // 정보가 없으면 일단 LIVE로(=실시간 현황) 보여줌
    return "LIVE";
  }, [resultRaw]);

  const title = votePhase === "LIVE" ? "실시간 투표 현황" : "투표 결과";

  const fetchResult = async () => {
    const res = await programApi.getContestVoteResult(programId);
    const data = normalizeData(res);

    setResultRaw(data);

    const list = extractCandidates(data);
    const sorted = [...list].sort((a, b) => getVoteCount(b) - getVoteCount(a));
    setCandidates(sorted);
  };

  // ----- effect -----
  useEffect(() => {
    if (!programId) {
      setErrorObj({ status: null, msg: "programId가 없습니다." });
      return;
    }

    let timerId = null;

    (async () => {
      try {
        setLoading(true);
        setErrorObj(null);
        await fetchResult();
      } catch (e) {
        setErrorObj(parseErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();

    // ✅ 투표중이면 실시간 폴링
    if (votePhase === "LIVE") {
      timerId = setInterval(() => {
        fetchResult().catch(() => {
          // 폴링 실패는 화면을 깨지 않게 조용히 무시
        });
      }, 3000);
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
    // votePhase 의존성 넣으면 타이머 제어가 더 정확하지만,
    // 여기서는 최소 변경으로 programId 기준으로만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  // ----- render -----
  if (!programId) {
    return (
      <div style={{ padding: 16 }}>
        <h2>결과발표</h2>
        <div style={{ color: "red" }}>programId가 없습니다.</div>
      </div>
    );
  }

  const top = candidates?.[0] ?? null;

  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => navigate(-1)}>뒤로</button>

      <h2 style={{ marginTop: 12 }}>{title}</h2>
      <div style={{ opacity: 0.6, marginBottom: 12 }}>
        programId: {programId}
      </div>

      {/* ✅ 에러 UX */}
      {errorObj && (
        <div style={{ marginBottom: 12 }}>
          {errorObj.status === 401 ? (
            <div style={styles.infoBox}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                현재 결과/현황이 비공개 상태입니다.
              </div>
              <div style={{ opacity: 0.8, marginBottom: 10 }}>
                “결과발표는 로그인 없이 확인” 요구사항이면, 서버에서
                <b> GET /api/programs/{`{programId}`}/votes/result</b> 를
                공개(permitAll)로 열어줘야 합니다.
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => window.location.reload()}
                  style={styles.secondaryBtn}
                >
                  새로고침
                </button>
                <button
                  onClick={() => navigate("/auth/login")}
                  style={styles.primaryBtn}
                >
                  로그인
                </button>
              </div>
            </div>
          ) : (
            <div style={{ color: "red" }}>
              {errorObj.status ? `[${errorObj.status}] ` : ""}
              {errorObj.msg}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div>불러오는 중...</div>
      ) : errorObj ? null : candidates.length === 0 ? ( // 에러 상태에서는 아래 리스트는 숨김
        <div>
          <div style={{ marginBottom: 8 }}>표시할 결과 데이터가 없습니다.</div>
          <button onClick={fetchResult} style={styles.secondaryBtn}>
            새로고침
          </button>
        </div>
      ) : (
        <>
          {/* ✅ RESULT 모드일 때 1등 강조 */}
          {votePhase === "RESULT" && top && (
            <div style={styles.winnerCard}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>🥇 1등</div>
              <div style={{ marginTop: 6, fontWeight: 700 }}>
                {getCandidateTitle(top)}
              </div>
              <div style={{ marginTop: 4, opacity: 0.8 }}>
                {getVoteCount(top)} 표
              </div>
            </div>
          )}

          <div style={{ display: "grid", gap: 10 }}>
            {candidates.map((c, idx) => {
              const key = getCandidateKey(c);
              const rank = idx + 1;

              return (
                <div key={String(key)} style={styles.row}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div style={styles.rankBadge}>{rank}</div>
                    <div>
                      <div style={{ fontWeight: 700 }}>
                        {getCandidateTitle(c)}
                      </div>
                      <div style={{ opacity: 0.65, fontSize: 13 }}>
                        후보ID: {String(key)}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 800 }}>
                    {getVoteCount(c)}
                    <span style={{ fontWeight: 400, opacity: 0.7 }}> 표</span>
                  </div>
                </div>
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
            <button onClick={fetchResult} style={styles.secondaryBtn}>
              새로고침
            </button>
            {votePhase === "LIVE" && (
              <div style={{ opacity: 0.6, alignSelf: "center", fontSize: 13 }}>
                3초마다 자동 갱신 중…
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  infoBox: {
    border: "1px solid #ddd",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fafafa",
  },
  winnerCard: {
    border: "1px solid #ddd",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    backgroundColor: "#fafafa",
  },
  row: {
    border: "1px solid #ddd",
    borderRadius: 10,
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#222",
    color: "#fff",
    fontWeight: 800,
    fontSize: 13,
  },
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
};
