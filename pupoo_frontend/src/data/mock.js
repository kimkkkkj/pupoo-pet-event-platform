export const navItems = [
  { to: "/", label: "홈페이지" },
  { to: "/project", label: "프로젝트 소개" },
  { to: "/features", label: "플랫폼 기능 소개" },
  { to: "/use-cases", label: "이용 흐름 및 활용 사례" },
  { to: "/tech", label: "팀 구성 및 기술 스택" },
  { to: "/news", label: "News" }
];

export const highlights = [
  { title: "QR 체크인", desc: "입장/세션/체험 흐름을 QR로 간단하게.", tag: "운영 자동화" },
  { title: "실시간 혼잡/대기", desc: "현장 혼잡도와 대기 현황을 한눈에.", tag: "안전 관리" },
  { title: "공지/알림", desc: "변경 사항을 즉시 안내하고 확인까지.", tag: "커뮤니케이션" }
];

export const newsPosts = [
  {
    id: "n1",
    title: "Cloud Native 기반으로 설계된 반려견 행사 통합 운영 플랫폼 pupoo",
    excerpt: "체험존 대기, 체크인, 공지, 참여 기록을 하나로 연결해 운영 효율을 높입니다.",
    date: "2026.01.20",
    category: "SQUARES",
    image: "https://images.unsplash.com/photo-1525253086316-d0c936c814f8?auto=format&fit=crop&w=1600&q=80"
  },
  {
    id: "n2",
    title: "애견 행사 현장의 복잡한 운영을 더 단순하고 따뜻한 경험으로",
    excerpt: "실시간 데이터 기반으로 참가자 경험과 운영 안정성을 동시에 개선합니다.",
    date: "2026.01.25",
    category: "SQUARES",
    image: "https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1600&q=80"
  }
];

export const categories = [
  { key: "popular", label: "인기상품" },
  { key: "new", label: "신상품" },
  { key: "items", label: "이벤트/패스" },
  { key: "exp", label: "이벤트/체험" },
  { key: "tip", label: "팁&상식" },
  { key: "friends", label: "플레이&스" }
];

export const adminKpis = [
  { label: "오늘 체크인", value: "1,248", delta: "+12%" },
  { label: "대기 평균", value: "18m", delta: "-4m" },
  { label: "혼잡도", value: "보통", delta: "B구역 ↑" },
  { label: "결제 성공", value: "312", delta: "+9%" }
];

export const adminEvents = [
  { id: "E-001", title: "2026 이천 애견 포럼", date: "2026-02-08", venue: "이천 컨벤션홀", status: "모집중" },
  { id: "E-002", title: "댕댕이 건강 박람회", date: "2026-03-02", venue: "코엑스 D홀", status: "예정" }
];

export const adminParticipants = [
  { id: "P-10021", name: "김하나", ticket: "일반", checkin: "완료", time: "10:12" },
  { id: "P-10022", name: "박지훈", ticket: "VIP", checkin: "대기", time: "-" },
  { id: "P-10023", name: "이수민", ticket: "일반", checkin: "완료", time: "10:19" }
];

export const adminNotices = [
  { id: "N-01", title: "체험존 A 대기 25분", time: "10:21", tone: "warn" },
  { id: "N-02", title: "세션 2 강연장 입장 시작", time: "10:30", tone: "success" },
  { id: "N-03", title: "현장 혼잡도 높음: B구역", time: "10:34", tone: "neutral" }
];
