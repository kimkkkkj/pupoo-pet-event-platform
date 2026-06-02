import { useState, useEffect, useRef } from "react";
import PageHeader from "../components/PageHeader";
import { loadKakaoMapScript } from "../../../shared/utils/kakaoMapScript";
import {
  MapPin,
  ParkingCircle,
  Banknote,
  Clock,
  Train,
  Bus,
  Car,
  Navigation,
  AlertTriangle,
  Map,
  ArrowUpRight,
  Copy,
} from "lucide-react";

const GUIDE_CATEGORIES = [
  { label: "현장 운영 안내", path: "/guide/operation" },
];

const VENUE_NAME = "올림픽 공원 88잔디마당";

const VENUE_ADDRESS = "서울특별시 송파구 올림픽로 424 (방이동 88-2)";

// 올림픽 공원 88잔디마당 (WGS84, 카카오 지도 좌표계)
const VENUE_COORDS = { lat: 37.5188, lng: 127.1253 };

const GUIDE_SUBTITLE_MAP = {
  "/guide/operation":
    "원활하고 즐거운 행사 참여를 위해 아래 안내 사항을 미리 확인해 주세요",
  "/guide/timetable":
    "프로그램은 현장 상황에 따라 일부 변경될 수 있습니다.",
  "/guide/location":
    "행사장 위치와 교통편 안내입니다. 대중교통 이용을 적극 권장드립니다.",
};

const styles = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');

  .loc-root {
    box-sizing: border-box;
    font-family: 'Pretendard Variable', 'Pretendard', -apple-system, sans-serif;
    background: #F5F6FA;
    min-height: 100vh;
  }
  .loc-root *, .loc-root *::before, .loc-root *::after {
    box-sizing: border-box; font-family: inherit;
  }
  .loc-container {
    max-width: 1400px; margin: 0 auto;
    padding: 28px 20px 80px;
  }
  .loc-two-col {
    display: grid;
    grid-template-columns: 340px 1fr;
    gap: 24px;
    align-items: start;
  }
  .loc-col-left {
    display: flex; flex-direction: column; gap: 16px;
  }
  .loc-col-right {
    display: flex; flex-direction: column; gap: 16px;
  }
  .loc-left-panel {
    background: #fff; border: 1px solid #EBEBEB; border-radius: 16px;
    overflow: hidden;
  }
  .loc-map-card {
    background: #fff; border: 1px solid #EBEBEB; border-radius: 16px;
    overflow: hidden;
  }
  .loc-map-card .loc-map-visual { display: block; width: 100%; aspect-ratio: 4/3; height: auto; min-height: 280px; }
  .loc-map-card .loc-map-visual .loc-map-inner { min-height: 280px; }
  .loc-col-left .loc-transport { grid-template-columns: 1fr; }

  /* ── 지도 영역 ── */
  .loc-map-hero {
    border-radius: 16px;
    overflow: hidden;
    background: #fff;
    border: 1px solid #EBEBEB;
    margin-bottom: 12px;
  }
  .loc-map-visual {
    position: relative;
    height: 240px;
    background: linear-gradient(135deg, #E6F7F2 0%, #CCF0E4 50%, #CCF0E4 100%);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 12px;
    overflow: hidden;
  }
  .loc-map-visual::before {
    content: '';
    position: absolute; inset: 0;
    background:
      repeating-linear-gradient(0deg, transparent, transparent 32px, rgba(255,255,255,0.4) 32px, rgba(255,255,255,0.4) 33px),
      repeating-linear-gradient(90deg, transparent, transparent 32px, rgba(255,255,255,0.4) 32px, rgba(255,255,255,0.4) 33px);
    pointer-events: none;
  }
  .loc-map-pin {
    width: 56px; height: 56px;
    border-radius: 50%;
    background: #7ab33e;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 6px 24px rgba(27,80,217,0.3), 0 0 0 8px rgba(27,80,217,0.12);
    position: relative; z-index: 1;
  }
  .loc-map-label {
    font-size: 14px; font-weight: 700;
    color: #7ab33e; background: #fff;
    padding: 7px 16px; border-radius: 100px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    position: relative; z-index: 1;
  }
  .loc-map-sublabel {
    font-size: 12px; color: #9CA3AF;
    position: relative; z-index: 1; margin-top: -4px;
  }

  .loc-map-footer {
    padding: 18px 20px;
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
  }
  .loc-addr-main {
    font-size: 15px; font-weight: 700; color: #111827;
  }
  .loc-addr-sub {
    font-size: 12.5px; color: #9CA3AF; margin-top: 4px;
    display: flex; align-items: center; gap: 5px;
  }
  .loc-map-cta {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 10px 20px; border-radius: 10px;
    background: #7ab33e; color: #fff;
    font-size: 13px; font-weight: 700;
    border: none; cursor: pointer;
    font-family: inherit; transition: all 0.15s;
    white-space: nowrap; flex-shrink: 0;
  }
  .loc-map-cta:hover { background: #1640B8; }
  .loc-map-visual.has-map .loc-map-loading { display: none; }
  .loc-map-visual .loc-map-inner { position: absolute; inset: 0; width: 100%; height: 100%; min-height: 240px; }
  .loc-transport-tabs {
    display: flex; gap: 8px; padding: 12px 20px;
    background: #F9FAFB; border-bottom: 1px solid #EBEBEB;
  }
  .loc-transport-tab {
    padding: 8px 16px; border-radius: 8px; border: 1px solid #E5E7EB;
    background: #fff; font-size: 13px; font-weight: 600; color: #6B7280;
    cursor: pointer; font-family: inherit; transition: all 0.15s;
  }
  .loc-transport-tab:hover { border-color: #7ab33e; color: #7ab33e; }
  .loc-transport-tab.active { background: #7ab33e; color: #fff; border-color: #7ab33e; }
  .loc-addr-wrap { display: flex; align-items: flex-start; gap: 10px; flex-wrap: wrap; }
  .loc-copy-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 12px; border-radius: 8px; border: 1px solid #E5E7EB;
    background: #fff; font-size: 12px; font-weight: 600; color: #6B7280;
    cursor: pointer; font-family: inherit; transition: all 0.15s; flex-shrink: 0;
  }
  .loc-copy-btn:hover { border-color: #7ab33e; color: #7ab33e; }
  .loc-toast {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    padding: 10px 20px; border-radius: 10px; background: #111827; color: #fff;
    font-size: 13px; font-weight: 500; z-index: 100; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }

  /* ── 정보 카드 그리드 ── */
  .loc-info-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 28px;
  }
  .loc-info-card {
    background: #fff;
    border: 1px solid #EBEBEB;
    border-radius: 16px;
    padding: 20px;
  }
  .loc-info-card-header {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 16px; padding-bottom: 14px;
    border-bottom: 1px solid #F3F4F6;
  }
  .loc-info-card-icon {
    width: 36px; height: 36px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .loc-info-card-icon.blue   { background: #E6F7F2; color: #7ab33e; }
  .loc-info-card-icon.amber  { background: #FEF3C7; color: #92400E; }
  .loc-info-card-icon.slate  { background: #F3F4F6; color: #374151; }
  .loc-info-card-title {
    font-size: 14px; font-weight: 700; color: #111827;
  }

  .loc-detail-row {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 9px 0;
    border-bottom: 1px solid #F9FAFB;
  }
  .loc-detail-row:last-child { border-bottom: none; padding-bottom: 0; }
  .loc-detail-icon { color: #D1D5DB; flex-shrink: 0; margin-top: 2px; }
  .loc-detail-label {
    font-size: 11px; font-weight: 700;
    color: #9CA3AF; letter-spacing: 0.3px;
    text-transform: uppercase;
    margin-bottom: 3px;
  }
  .loc-detail-value {
    font-size: 13px; font-weight: 500;
    color: #111827; line-height: 1.55;
  }
  .loc-detail-muted {
    font-size: 12px; color: #9CA3AF; margin-top: 2px;
  }
  .loc-detail-highlight {
    font-weight: 700; color: #7ab33e;
  }

  /* ── 섹션 헤더 ── */
  .loc-sec-label {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 20px;
  }
  .loc-sec-num {
    font-size: 13px; font-weight: 800;
    color: #7ab33e;
    width: 32px; height: 32px;
    background: #E6F7F2;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
  }
  .loc-sec-text {
    font-size: 17px; font-weight: 800; color: #111827;
    letter-spacing: -0.3px;
  }

  /* ── 교통편 카드 ── */
  .loc-transport {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 12px;
  }
  .loc-tr-card {
    background: #fff;
    border: 1px solid #EBEBEB;
    border-radius: 16px;
    padding: 20px;
    position: relative; overflow: hidden;
    transition: all 0.2s;
  }
  .loc-tr-card::before {
    content: '';
    position: absolute; top: 0; left: 0;
    width: 100%; height: 3px;
    background: #7ab33e;
    opacity: 0; transition: opacity 0.2s;
  }
  .loc-tr-card:hover {
    border-color: #C7D2FA;
    box-shadow: 0 4px 16px rgba(27,80,217,0.08);
    transform: translateY(-2px);
  }
  .loc-tr-card:hover::before { opacity: 1; }

  .loc-tr-icon {
    width: 44px; height: 44px;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 16px;
  }
  .loc-tr-icon.subway { background: #E6F7F2; color: #7ab33e; }
  .loc-tr-icon.bus    { background: #D1FAE5; color: #065F46; }
  .loc-tr-icon.car    { background: #FEF3C7; color: #92400E; }

  .loc-tr-title {
    font-size: 14px; font-weight: 700;
    color: #111827; margin-bottom: 14px;
  }
  .loc-tr-row {
    display: flex; align-items: flex-start; gap: 9px;
    margin-bottom: 10px;
  }
  .loc-tr-row:last-child { margin-bottom: 0; }
  .loc-tr-badge {
    width: 22px; height: 22px;
    border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 800;
    flex-shrink: 0; margin-top: 1px;
  }
  .loc-tr-badge.dark   { background: #7ab33e; color: #fff; }
  .loc-tr-badge.green  { background: #059669; color: #fff; }
  .loc-tr-badge.orange { background: #D97706; color: #fff; }
  .loc-tr-text {
    font-size: 13px; color: #6B7280;
    line-height: 1.55;
  }
  .loc-tr-text strong { font-weight: 700; color: #111827; }
  .loc-tr-warn {
    font-size: 12.5px; color: #DC2626;
    font-weight: 600;
  }

  /* ── 공지 ── */
  .loc-alert {
    background: #FFFBEB;
    border: 1.5px solid #FDE68A;
    border-radius: 12px;
    padding: 16px 18px;
    display: flex; align-items: flex-start; gap: 12px;
  }
  .loc-alert-icon {
    width: 32px; height: 32px;
    border-radius: 8px;
    background: #FEF3C7;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; color: #92400E;
  }
  .loc-alert-title {
    font-size: 13px; font-weight: 700;
    color: #92400E; margin-bottom: 3px;
  }
  .loc-alert-text {
    font-size: 13px; color: #92400E;
    line-height: 1.6; opacity: 0.75;
  }

  @media (max-width: 900px) {
    .loc-two-col { grid-template-columns: 1fr; }
  }
  @media (max-width: 860px) {
    .loc-info-grid { grid-template-columns: 1fr; }
    .loc-transport { grid-template-columns: 1fr; }
  }
  @media (max-width: 640px) {
    .loc-container { padding: 20px 16px 64px; }
    .loc-map-footer { flex-direction: column; align-items: flex-start; }
    .loc-sec-text { font-size: 16px; }
  }
`;

const TRANSPORT_OPTIONS = [
  { id: "subway", label: "지하철", icon: Train },
  { id: "bus", label: "버스", icon: Bus },
  { id: "car", label: "승용차", icon: Car },
];

export default function Location({ onNavigate }) {
  const currentPath = "/guide/location";
  const [transportMode, setTransportMode] = useState("subway");
  const [copyToast, setCopyToast] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  const cancelledRef = useRef(false);
  useEffect(() => {
    const appKey = import.meta.env.VITE_KAKAO_MAP_KEY;
    if (!appKey) {
      setMapError("key");
      return;
    }
    cancelledRef.current = false;
    let timeoutId = null;

    const runInit = (container) => {
      loadKakaoMapScript(appKey)
        .then(() => {
          if (cancelledRef.current || !mapContainerRef.current) return;
          try {
            const { kakao } = window;
            const position = new kakao.maps.LatLng(VENUE_COORDS.lat, VENUE_COORDS.lng);
            const options = { center: position, level: 5 };
            const map = new kakao.maps.Map(container, options);
            const marker = new kakao.maps.Marker({ position });
            marker.setMap(map);
            mapRef.current = map;
            setMapLoaded(true);
            setMapError(null);
            const relayout = () => {
              try {
                map.relayout();
              } catch (_) {}
            };
            requestAnimationFrame(relayout);
            setTimeout(relayout, 100);
          } catch (_) {
            if (!cancelledRef.current) {
              setMapLoaded(false);
              setMapError("map");
            }
          }
        })
        .catch(() => {
          if (!cancelledRef.current) {
            setMapLoaded(false);
            setMapError("script");
          }
        });
    };

    if (mapContainerRef.current) {
      runInit(mapContainerRef.current);
    } else {
      timeoutId = setTimeout(() => {
        if (mapContainerRef.current && !cancelledRef.current) {
          runInit(mapContainerRef.current);
        }
      }, 200);
    }

    return () => {
      cancelledRef.current = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(VENUE_ADDRESS).then(() => {
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2000);
    });
  };

  return (
    <div className="loc-root">
      <style>{styles}</style>
      <PageHeader
        title="장소 / 오시는길"
        subtitle={GUIDE_SUBTITLE_MAP[currentPath]}
        categories={GUIDE_CATEGORIES}
        currentPath={currentPath}
        onNavigate={onNavigate}
      />
      <main className="loc-container">
        <div className="loc-two-col">
          {/* 좌측: 교통수단 선택 + 상세 목록 */}
          <div className="loc-col-left">
            <div className="loc-left-panel">
              <div className="loc-transport-tabs">
                {TRANSPORT_OPTIONS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    className={`loc-transport-tab ${transportMode === id ? "active" : ""}`}
                    onClick={() => setTransportMode(id)}
                  >
                    <Icon size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 교통편 상세 (선택한 교통수단만 표시) */}
            <div className="loc-left-panel">
              <div className="loc-transport" style={{ marginBottom: 0, padding: 12 }}>
                {transportMode === "subway" && (
                  <div className="loc-tr-card">
                    <div className="loc-tr-icon subway"><Train size={20} /></div>
                    <div className="loc-tr-title">지하철</div>
                    <div className="loc-tr-row">
                      <div className="loc-tr-badge dark">5</div>
                      <div className="loc-tr-text"><strong>5호선</strong> 올림픽공원역 3번 출구 → 도보 5분</div>
                    </div>
                    <div className="loc-tr-row">
                      <div className="loc-tr-badge orange">9</div>
                      <div className="loc-tr-text"><strong>9호선</strong> 한성백제역 1번 출구 → 도보 10분</div>
                    </div>
                    <div className="loc-tr-row">
                      <div className="loc-tr-badge green">2</div>
                      <div className="loc-tr-text"><strong>2호선</strong> 잠실역 8번 출구 → 버스 환승 10분</div>
                    </div>
                  </div>
                )}
                {transportMode === "bus" && (
                  <div className="loc-tr-card">
                    <div className="loc-tr-icon bus"><Bus size={20} /></div>
                    <div className="loc-tr-title">버스</div>
                    <div className="loc-tr-row">
                      <div className="loc-tr-badge dark">간</div>
                      <div className="loc-tr-text"><strong>간선버스</strong> 340, 3312, 3411</div>
                    </div>
                    <div className="loc-tr-row">
                      <div className="loc-tr-badge green">지</div>
                      <div className="loc-tr-text"><strong>지선버스</strong> 2412, 3313</div>
                    </div>
                    <div className="loc-tr-row">
                      <MapPin size={14} style={{ color: "#D1D5DB", flexShrink: 0, marginTop: 3 }} />
                      <div className="loc-tr-text">올림픽공원 정류장 하차 후 도보 3분</div>
                    </div>
                  </div>
                )}
                {transportMode === "car" && (
                  <div className="loc-tr-card">
                    <div className="loc-tr-icon car"><Car size={20} /></div>
                    <div className="loc-tr-title">자가용</div>
                    <div className="loc-tr-row">
                      <Navigation size={14} style={{ color: "#D1D5DB", flexShrink: 0, marginTop: 3 }} />
                      <div className="loc-tr-text"><strong>내비게이션 검색</strong><br />「{VENUE_NAME}」</div>
                    </div>
                    <div className="loc-tr-row">
                      <Car size={14} style={{ color: "#D1D5DB", flexShrink: 0, marginTop: 3 }} />
                      <div className="loc-tr-text">강변북로 → 올림픽대로 → 올림픽공원 진입</div>
                    </div>
                    <div className="loc-tr-row">
                      <AlertTriangle size={14} style={{ color: "#DC2626", flexShrink: 0, marginTop: 3 }} />
                      <div className="loc-tr-warn">행사 당일 도로 혼잡 예상</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 우측: 지도 + 주소 + 상세 안내 */}
          <div className="loc-col-right">
            <div className="loc-map-card">
              <div className={`loc-map-visual ${mapLoaded ? "has-map" : ""} ${mapError ? "loc-map-error" : ""}`}>
                <div ref={mapContainerRef} className="loc-map-inner" />
                {!mapLoaded && (
                  <div className="loc-map-loading" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "linear-gradient(135deg, #E6F7F2 0%, #CCF0E4 50%, #CCF0E4 100%)" }}>
                    {mapError ? (
                      <>
                        <div className="loc-map-sublabel" style={{ color: "#6B7280", fontWeight: 600, marginBottom: 4 }}>지도를 불러올 수 없습니다</div>
                        <div className="loc-map-sublabel" style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", maxWidth: 280 }}>
                          일시적으로 지도를 표시할 수 없습니다. 잠시 후 다시 시도해 주시거나, 아래 주소를 복사해 지도 앱에서 검색해 보세요.
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="loc-map-pin"><Map size={26} color="#fff" /></div>
                        <div className="loc-map-label">{VENUE_NAME}</div>
                        <div className="loc-map-sublabel">지도를 불러오는 중...</div>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="loc-map-footer">
                <div className="loc-addr-wrap">
                  <div>
                    <div className="loc-addr-main">{VENUE_ADDRESS}</div>
                    <div className="loc-addr-sub"><MapPin size={12} />{VENUE_NAME}</div>
                  </div>
                  <button type="button" className="loc-copy-btn" onClick={handleCopyAddress}>
                    <Copy size={14} />복사
                  </button>
                </div>
                <button
                  className="loc-map-cta"
                  onClick={() => {
                    const query = encodeURIComponent(VENUE_NAME);
                    const url = `https://map.kakao.com/link/search/${query}`;
                    window.open(url, "_blank");
                  }}
                >
                  <Navigation size={14} />지도 앱으로 보기<ArrowUpRight size={12} />
                </button>
              </div>
            </div>

            {/* 주차 안내: 승용차 선택 시에만 표시 */}
            {transportMode === "car" && (
              <div className="loc-info-grid" style={{ gridTemplateColumns: "1fr" }}>
                <div className="loc-info-card">
                  <div className="loc-info-card-header">
                    <div className="loc-info-card-icon amber">
                      <ParkingCircle size={17} />
                    </div>
                    <div className="loc-info-card-title">주차 안내</div>
                  </div>
                  <div className="loc-detail-row">
                    <AlertTriangle
                      size={14}
                      className="loc-detail-icon"
                      style={{ color: "#D97706" }}
                    />
                    <div>
                      <div className="loc-detail-label">주의</div>
                      <div className="loc-detail-value">
                        행사 기간 중 주차 공간이 매우 혼잡합니다.{" "}
                        <span className="loc-detail-highlight">대중교통 이용</span>을
                        권장합니다.
                      </div>
                    </div>
                  </div>
                  <div className="loc-detail-row">
                    <Banknote size={14} className="loc-detail-icon" />
                    <div>
                      <div className="loc-detail-label">주차 요금</div>
                      <div className="loc-detail-value">
                        최초 30분 무료, 이후 10분당 400원
                      </div>
                    </div>
                  </div>
                  <div className="loc-detail-row">
                    <Clock size={14} className="loc-detail-icon" />
                    <div>
                      <div className="loc-detail-label">운영 시간</div>
                      <div className="loc-detail-value">오전 8:00 – 오후 8:00</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {copyToast && <div className="loc-toast" role="status">주소가 복사되었습니다</div>}

        {/* 공지 */}
        <div className="loc-alert">
          <div className="loc-alert-icon">
            <AlertTriangle size={16} />
          </div>
          <div>
            <div className="loc-alert-title">교통 혼잡 안내</div>
            <div className="loc-alert-text">
              행사 당일 주변 도로가 매우 혼잡할 수 있습니다. 여유 있는 출발
              시간을 계획하시고, 가급적 대중교통을 이용해 주시기 바랍니다.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
