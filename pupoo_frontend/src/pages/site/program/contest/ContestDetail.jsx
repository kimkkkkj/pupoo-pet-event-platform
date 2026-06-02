import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { programApi } from "../../../../app/http/programApi";

export default function ContestDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const programId = searchParams.get("programId");

  const [loading, setLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [candidateLoading, setCandidateLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [program, setProgram] = useState(null);

  // ✅ C안: 내 신청(해당 programId의 active 1건)
  const [myApply, setMyApply] = useState(null);  

  // ✅ 후보 목록(승인된 신청자만 내려와야 함)
  const [candidates, setCandidates] = useState([]);

  const applyBtnLabel = useMemo(
    () => (myApply ? "신청정보 보기" : "참가신청"),
    [myApply],
  );

  const handle401 = () => {
    alert("로그인이 필요합니다.");
    const from = `${location.pathname}${location.search}`;
    navigate("/auth/login", { state: { from } });
  };

  const extractList = (res) => {
    // ApiResponse/PageResponse/배열 케이스 모두 대응
    const data = res?.data?.data ?? res?.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  };

  const pickActiveApply = (applies, pid) => {
    const programIdNum = Number(pid);
    if (!Array.isArray(applies)) return null;

    // programId 매칭
    const matched = applies.filter((a) => Number(a.programId) === programIdNum);
    if (matched.length === 0) return null;

    // active 기준: status !== CANCELLED (C안 요구)
    const active = matched.find(
      (a) => String(a?.status ?? "").toUpperCase() !== "CANCELLED",
    );

    return active ?? null;
  };

  useEffect(() => {
    if (!programId) {
      setErrorMsg("programId가 없습니다.");
      setProgram(null);
      setMyApply(null);
      setCandidates([]);
      return;
    }

    // 0) 초기화
    setErrorMsg("");

    // 1) 상세 조회
    (async () => {
      setLoading(true);
      try {
        const res = await programApi.getProgramDetail(programId);
        setProgram(res.data.data);
      } catch (e) {
        const statusCode = e?.response?.status;
        if (statusCode === 401) return handle401();

        const msg =
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          "콘테스트 상세 조회 실패";
        setErrorMsg(statusCode ? `[${statusCode}] ${msg}` : msg);
        setProgram(null);
      } finally {
        setLoading(false);
      }
    })();

    // 2) ✅ C안: 내 신청 목록 1회 호출 후 programId로 필터링
    (async () => {
      setApplyLoading(true);
      try {
        const res = await programApi.getMyProgramApplies({ size: 200 });
        const list = extractList(res);
        const active = pickActiveApply(list, programId);
        setMyApply(active);
      } catch (e) {
        const statusCode = e?.response?.status;

        // ✅ 상세 페이지에서는 로그인 강제하면 안 됨
        // 401이면 "미신청"으로만 처리하고 화면 유지
        if (statusCode === 401) {
          setMyApply(null);
          return;
        }

        // 기타 오류도 치명적이지 않게: 미신청으로 처리
        setMyApply(null);
      } finally {
        setApplyLoading(false);
      }
    })();

    // 3) ✅ 후보 목록(승인된 신청자만)
    (async () => {
      setCandidateLoading(true);
      try {
        // ⚠️ programApi에 getCandidates가 있어야 함(아래에 추가 코드 제공)
        const res = await programApi.getCandidates(programId, { page: 0, size: 200 });
        const list = extractList(res);

        // 방어: 혹시라도 백엔드/데이터 섞였을 때 APPROVED만 남김
        const approvedOnly = list.filter(
          (c) => String(c?.status ?? "").toUpperCase() === "APPROVED",
        );

        setCandidates(approvedOnly);
      } catch (e) {
        const statusCode = e?.response?.status;

        // 후보는 공개로 열어뒀다면 401이면 이상하지만,
        // 혹시 인증 필요 정책이면 여기서 로그인 유도 가능
        if (statusCode === 401) {
          setCandidates([]);
          return;
        }

        // 후보 조회 실패는 치명적 에러로 막지 않고, 안내만 띄우는 방향
        setCandidates([]);
      } finally {
        setCandidateLoading(false);
      }
    })();
  }, [programId]);

  if (loading) return <div style={{ padding: 16 }}>로딩중...</div>;

  if (errorMsg) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: "red", marginBottom: 12 }}>에러: {errorMsg}</div>
        <button onClick={() => navigate(-1)}>뒤로</button>
      </div>
    );
  }

  if (!program) return <div style={{ padding: 16 }}>데이터 없음</div>;

  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => navigate(-1)}>뒤로</button>

      <h2 style={{ marginTop: 12 }}>{program.programTitle}</h2>

      <div style={{ opacity: 0.8 }}>
        {String(program.startAt ?? "")} ~ {String(program.endAt ?? "")}
      </div>

      {program.description && (
        <div style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>
          {program.description}
        </div>
      )}

      {/* 기능 버튼 영역 */}
      <div style={styles.actionWrap}>
        <button
          type="button"
          onClick={() =>
            navigate(`/program/contest/apply?programId=${program.programId}`)
          }
          style={{ ...styles.actionBtn, ...styles.primaryBtn }}
          disabled={applyLoading}
          title={applyLoading ? "신청 상태 확인 중" : ""}
        >
          {applyLoading ? "확인 중..." : applyBtnLabel}
        </button>

        <button
          type="button"
          onClick={() =>
            navigate(`/program/contest/vote?programId=${program.programId}`)
          }
          style={{ ...styles.actionBtn, ...styles.secondaryBtn }}
        >
          실시간 투표
        </button>

        <button
          type="button"
          onClick={() =>
            navigate(`/program/contest/result?programId=${program.programId}`)
          }
          style={{ ...styles.actionBtn, ...styles.ghostBtn }}
        >
          결과발표
        </button>
      </div>

      {/* (선택) 디버깅용: 현재 신청 상태 */}
      {myApply && (
        <div style={{ marginTop: 12, color: "#666" }}>
          현재 신청 상태: <b>{myApply.status ?? "UNKNOWN"}</b>
        </div>
      )}

      {/* ✅ 후보 목록 표시 */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>후보 목록(승인된 신청자)</div>

        {candidateLoading ? (
          <div style={{ color: "#666" }}>후보 불러오는 중...</div>
        ) : candidates.length === 0 ? (
          <div style={{ color: "#666" }}>표시할 후보가 없습니다.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {candidates.map((c) => (
              <div
                key={c.programApplyId}
                style={{
                  border: "1px solid #e5e5e5",
                  borderRadius: 10,
                  padding: 12,
                  background: "#fff",
                }}
              >
                <div style={{ fontWeight: 600 }}>후보 {c.programApplyId}</div>
                <div style={{ color: "#666", fontSize: 13 }}>
                  userId: {c.userId} / status: {c.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== 스타일 ===== */
const styles = {
  actionWrap: {
    marginTop: 20,
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  actionBtn: {
    padding: "10px 18px",
    borderRadius: 8,
    fontSize: 14,
    cursor: "pointer",
    border: "1px solid #ccc",
    whiteSpace: "nowrap",
  },
  primaryBtn: {
    backgroundColor: "#222",
    color: "#fff",
    borderColor: "#222",
  },
  secondaryBtn: {
    backgroundColor: "#fff",
    color: "#222",
  },
  ghostBtn: {
    backgroundColor: "#f5f5f5",
    color: "#333",
  },
  candidateCard: {
    border: "1px solid #e5e5e5",
    borderRadius: 10,
    padding: 12,
    background: "#fff",
  },
};