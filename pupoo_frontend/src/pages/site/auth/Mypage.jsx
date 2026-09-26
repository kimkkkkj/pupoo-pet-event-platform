import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { mypageApi } from "./api/mypageApi";
import {
  notificationApi,
  NOTIFICATION_UNREAD_COUNT_EVENT,
  emitNotificationUnreadCount,
} from "../../../app/http/notificationApi";
import { reviewApi } from "../../../app/http/reviewApi";
import { eventApi } from "../../../app/http/eventApi";
import { interestApi } from "../../../app/http/interestApi";
import PetAvatar from "../../../shared/components/pet/PetAvatar";
import { toPublicAssetUrl } from "../../../shared/utils/publicAssetUrl";
import {
  BellOff, PawPrint, QrCode, CalendarDays, Star, CheckCircle2, Circle,
  PartyPopper, Presentation, Compass, Store, Trophy, Megaphone,
  Cookie, Bath, Scissors, Puzzle, Shirt, HeartPulse,
  GraduationCap, Footprints, Pill, Watch, MoreHorizontal,
  ChevronRight, ChevronLeft, Bell, Heart, Settings, ArrowLeftRight, Ticket,
  AlertCircle,
} from "lucide-react";

const styles = `
  .mp { --ink: #1c1917; --sub: #57534e; --mute: #a8a29e; --line: #e7e5e0; --soft: #f5f5f3; --accent: #5E8F2A; --accent-soft: #f1f6ea;
        background: #f7f7f5; min-height: 100vh; color: var(--ink);
        font-family: 'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif; }
  .mp * { box-sizing: border-box; }
  .mp-wrap { width: min(1400px, calc(100% - 40px)); margin: 0 auto; padding: calc(var(--pupoo-site-header-offset, 92px) + 36px) 0 96px; }

  /* 프로필 */
  .mp-profile { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; padding: 28px 30px; background: #fff; border: 1px solid var(--line); border-radius: 18px; }
  .mp-me { display: flex; align-items: center; gap: 20px; min-width: 0; }
  .mp-avatar { width: 72px; height: 72px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 30px; font-weight: 800; flex-shrink: 0; }
  .mp-hello { margin: 0 0 4px; font-size: 14.5px; font-weight: 600; color: var(--mute); }
  .mp-name { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.03em; word-break: keep-all; }
  .mp-meta { margin: 6px 0 0; display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: 14.5px; color: var(--sub); }
  .mp-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .mp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 46px; padding: 0 18px; border-radius: 12px; border: 1px solid var(--line); background: #fff; font-family: inherit; font-size: 15px; font-weight: 700; color: var(--ink); cursor: pointer; transition: border-color .15s, background .15s; white-space: nowrap; }
  .mp-btn:hover { border-color: var(--ink); }
  .mp-btn.dark { background: var(--ink); border-color: var(--ink); color: #fff; }
  .mp-btn.dark:hover { background: #000; }
  .mp-btn.sm { height: 38px; padding: 0 14px; font-size: 14px; border-radius: 10px; }
  .mp-btn:disabled { opacity: .5; cursor: default; }

  /* 탭 */
  .mp-tabs { display: flex; gap: 28px; margin: 26px 0 24px; border-bottom: 1px solid var(--line); overflow-x: auto; scrollbar-width: none; }
  .mp-tabs::-webkit-scrollbar { display: none; }
  .mp-tab { position: relative; display: inline-flex; align-items: center; gap: 6px; padding: 14px 0 16px; border: none; background: none; font-family: inherit; font-size: 17px; font-weight: 700; color: var(--mute); cursor: pointer; white-space: nowrap; }
  .mp-tab:hover { color: var(--sub); }
  .mp-tab.on { color: var(--ink); }
  .mp-tab.on::after { content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: var(--ink); }
  .mp-tab em { font-style: normal; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px; background: #dc2626; color: #fff; font-size: 12px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; }

  .mp-alert { display: flex; gap: 8px; align-items: center; margin-bottom: 18px; padding: 13px 16px; border-radius: 12px; border: 1px solid #efd9c7; background: #fdf6f0; color: #8a4a1c; font-size: 14.5px; font-weight: 600; }

  /* 패널 */
  .mp-stack { display: flex; flex-direction: column; gap: 18px; }
  .mp-grid { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 18px; align-items: start; }
  .mp-panel { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 26px 28px; }
  .mp-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; margin-bottom: 14px; }
  .mp-title { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
  .mp-note { margin: 5px 0 0; font-size: 14.5px; color: var(--sub); }
  .mp-more { border: none; background: none; padding: 4px 0; font-family: inherit; font-size: 14.5px; font-weight: 700; color: var(--sub); cursor: pointer; display: inline-flex; align-items: center; gap: 2px; white-space: nowrap; }
  .mp-more:hover { color: var(--ink); }

  /* 숫자 */
  .mp-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); background: #fff; border: 1px solid var(--line); border-radius: 16px; }
  .mp-stat { padding: 22px 26px; border: none; background: none; text-align: left; font-family: inherit; cursor: pointer; }
  .mp-stat + .mp-stat { border-left: 1px solid var(--line); }
  .mp-stat:hover .mp-stat-label { color: var(--ink); }
  .mp-stat-label { font-size: 15px; font-weight: 700; color: var(--sub); }
  .mp-stat-value { margin-top: 6px; font-size: 36px; font-weight: 800; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; color: var(--ink); }
  .mp-stat-value small { font-size: 16px; font-weight: 700; color: var(--sub); margin-left: 3px; }

  /* 목록 */
  .mp-list { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line); }
  .mp-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 16px; align-items: center; padding: 16px 2px; border-bottom: 1px solid var(--line); }
  .mp-row.with-thumb { grid-template-columns: 64px minmax(0, 1fr) auto; }
  .mp-thumb { width: 64px; height: 80px; border-radius: 10px; object-fit: cover; background: var(--soft); }
  .mp-row-name { font-size: 17px; font-weight: 700; word-break: keep-all; }
  .mp-row-sub { margin-top: 4px; font-size: 14px; color: var(--sub); line-height: 1.5; }
  .mp-row-end { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .mp-state { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 700; white-space: nowrap; }
  .mp-state i { width: 8px; height: 8px; border-radius: 50%; background: var(--mute); }
  .mp-state.ok { color: #3f7d3a; } .mp-state.ok i { background: #3f7d3a; }
  .mp-state.wait { color: #b91c1c; } .mp-state.wait i { background: #dc2626; }
  .mp-state.off { color: var(--mute); }
  .mp-dday { min-width: 64px; text-align: right; font-size: 17px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .mp-dday.live { color: #3f7d3a; }
  .mp-dday.past { color: var(--mute); font-size: 14.5px; }
  .mp-link-btn { border: none; background: none; padding: 6px 8px; border-radius: 8px; font-family: inherit; font-size: 14px; font-weight: 700; color: var(--sub); cursor: pointer; }
  .mp-link-btn:hover { background: var(--soft); color: var(--ink); }
  .mp-link-btn:disabled { opacity: .5; cursor: default; }

  /* 반려동물 */
  .mp-pets { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
  .mp-pet { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 24px 18px 18px; border: 1px solid var(--line); border-radius: 16px; background: #fff; text-align: center; }
  .mp-pet-name { font-size: 19px; font-weight: 800; }
  .mp-pet-info { font-size: 14.5px; color: var(--sub); }
  .mp-pet-add { justify-content: center; border: 1.5px dashed #cbc7bf; color: var(--sub); font-family: inherit; font-size: 16px; font-weight: 700; cursor: pointer; min-height: 220px; }
  .mp-pet-add:hover { border-color: var(--ink); color: var(--ink); }
  .mp-pet-row { display: flex; align-items: center; gap: 14px; padding: 12px 2px; border-bottom: 1px solid var(--line); }
  .mp-pet-row:first-child { border-top: 1px solid var(--line); }

  /* 관심 구독 */
  .mp-interests { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
  .mp-interest { display: flex; align-items: center; gap: 10px; height: 56px; padding: 0 16px; border: 1px solid var(--line); border-radius: 12px; background: #fff; font-family: inherit; font-size: 15px; font-weight: 700; color: var(--sub); cursor: pointer; transition: border-color .15s; }
  .mp-interest:hover { border-color: #c9c5bd; }
  .mp-interest.on { border-color: var(--ink); color: var(--ink); background: #fafaf8; }
  .mp-interest .chk { margin-left: auto; color: var(--mute); }
  .mp-interest.on .chk { color: var(--accent); }

  /* 관심 구독 탭 */
  .mp-int { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 18px; align-items: start; }
  .mp-int-side { display: flex; flex-direction: column; gap: 18px; position: sticky; top: calc(var(--pupoo-site-header-offset, 92px) + 16px); }
  .mp-int-group + .mp-int-group { margin-top: 26px; }
  .mp-int-group-head { display: flex; align-items: baseline; gap: 10px; margin: 6px 0 12px; }
  .mp-int-group-head h3 { margin: 0; font-size: 17px; font-weight: 800; }
  .mp-int-group-head span { font-size: 13.5px; color: var(--mute); }
  .mp-int-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px; }
  .mp-int-card { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; min-height: 176px; padding: 20px; border-radius: 16px; border: 1.5px solid var(--line); background: #fff; font-family: inherit; text-align: left; cursor: pointer; transition: border-color .15s, box-shadow .15s, transform .15s; }
  .mp-int-card:hover { border-color: #c9c5bd; box-shadow: 0 8px 20px rgba(28, 25, 23, .06); transform: translateY(-1px); }
  .mp-int-card.on { border-color: var(--accent); background: #fbfdf8; }
  .mp-int-icon { width: 46px; height: 46px; border-radius: 13px; background: var(--soft); color: var(--sub); display: flex; align-items: center; justify-content: center; }
  .mp-int-card.on .mp-int-icon { background: var(--accent-soft); color: var(--accent); }
  .mp-int-name { margin-top: 4px; font-size: 17px; font-weight: 800; color: var(--ink); }
  .mp-int-desc { font-size: 14px; line-height: 1.5; color: var(--sub); word-break: keep-all; }
  .mp-int-state { margin-top: auto; display: inline-flex; align-items: center; gap: 5px; font-size: 14px; font-weight: 800; color: var(--ink); }
  .mp-int-state.on { color: var(--accent); }
  .mp-int-samples { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .mp-int-samples li { display: flex; gap: 12px; align-items: flex-start; padding: 14px; border-radius: 14px; background: var(--soft); }
  .mp-int-samples li.on { background: var(--accent-soft); }
  .mp-int-sample-icon { width: 32px; height: 32px; border-radius: 10px; background: #fff; color: var(--sub); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .mp-int-samples li.on .mp-int-sample-icon { color: var(--accent); }
  .mp-int-sample-text { font-size: 14.5px; font-weight: 700; line-height: 1.45; word-break: keep-all; }
  .mp-int-sample-tag { margin-top: 4px; display: inline-flex; align-items: center; gap: 4px; font-size: 12.5px; font-weight: 600; color: var(--sub); }
  .mp-int-summary-num { font-size: 34px; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 6px; }
  .mp-int-summary-num small { font-size: 16px; font-weight: 700; color: var(--sub); margin-left: 4px; }
  @media (max-width: 1000px) {
    .mp-int { grid-template-columns: 1fr; }
    .mp-int-side { position: static; }
  }
  @media (max-width: 560px) {
    .mp-int-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
    .mp-int-card { min-height: 0; padding: 16px 14px; }
    .mp-int-desc { font-size: 13px; }
  }

  /* 구독 확인 창 */
  .mp-dim { position: fixed; inset: 0; z-index: 3000; background: rgba(28, 25, 23, .45); display: flex; align-items: center; justify-content: center; padding: 20px; }
  .mp-dialog { width: min(420px, 100%); padding: 28px 26px 22px; border-radius: 20px; background: #fff; box-shadow: 0 24px 60px rgba(0, 0, 0, .2); text-align: center; }
  .mp-dialog-icon { width: 56px; height: 56px; margin: 0 auto 14px; border-radius: 16px; background: var(--accent-soft); color: var(--accent); display: flex; align-items: center; justify-content: center; }
  .mp-dialog-title { margin: 0 0 8px; font-size: 21px; font-weight: 800; letter-spacing: -0.02em; word-break: keep-all; }
  .mp-dialog-desc { margin: 0 0 18px; font-size: 15px; line-height: 1.6; color: var(--sub); word-break: keep-all; }
  .mp-dialog-warn { margin: -6px 0 14px; font-size: 13.5px; font-weight: 600; color: #b91c1c; }
  .mp-channels { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 18px; }
  .mp-channel { display: flex; align-items: center; justify-content: center; gap: 6px; height: 48px; border-radius: 12px; border: 1.5px solid var(--line); font-size: 15px; font-weight: 700; color: var(--sub); cursor: pointer; }
  .mp-channel input { width: 16px; height: 16px; accent-color: var(--accent); }
  .mp-channel.on { border-color: var(--ink); color: var(--ink); }
  .mp-dialog-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .mp-btn.danger { background: #b91c1c; border-color: #b91c1c; color: #fff; }
  .mp-toast { position: fixed; left: 50%; bottom: 36px; transform: translateX(-50%); z-index: 3100; display: inline-flex; align-items: center; gap: 8px; padding: 14px 22px; border-radius: 14px; background: var(--ink); color: #fff; font-size: 15px; font-weight: 700; box-shadow: 0 10px 30px rgba(0, 0, 0, .2); animation: mp-toast-in .25s ease; }
  .mp-toast svg { color: #a3d977; }
  @keyframes mp-toast-in { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }

  .mp-empty { padding: 36px 12px; text-align: center; font-size: 15px; color: var(--sub); line-height: 1.7; }
  .mp-empty strong { display: block; margin-bottom: 4px; font-size: 16.5px; color: var(--ink); }

  @media (max-width: 1000px) { .mp-grid { grid-template-columns: 1fr; } }
  @media (max-width: 760px) {
    .mp-wrap { width: calc(100% - 28px); padding-top: calc(var(--pupoo-site-header-offset, 72px) + 16px); }
    .mp-profile { padding: 22px 18px; }
    .mp-avatar { width: 56px; height: 56px; font-size: 24px; }
    .mp-name { font-size: 23px; }
    .mp-actions { width: 100%; }
    .mp-actions .mp-btn { flex: 1; }
    .mp-tabs { gap: 20px; }
    .mp-tab { font-size: 16px; }
    .mp-stats { grid-template-columns: 1fr 1fr; }
    .mp-stat:nth-child(3) { border-left: none; }
    .mp-stat:nth-child(n + 3) { border-top: 1px solid var(--line); }
    .mp-stat { padding: 18px; }
    .mp-stat-value { font-size: 30px; }
    .mp-panel { padding: 22px 18px; }
    .mp-row.with-thumb { grid-template-columns: 52px minmax(0, 1fr); }
    .mp-row.with-thumb .mp-row-end { grid-column: 2; }
    .mp-thumb { width: 52px; height: 66px; }
  }
`;

const TABS = [
  { key: "overview", label: "내 정보" },
  { key: "events", label: "신청 행사" },
  { key: "history", label: "참여 이력" },
  { key: "notifications", label: "알림" },
];

const REG_STATUS_LABEL = {
  APPLIED: "신청 완료",
  APPROVED: "승인 완료",
  CANCELLED: "취소",
  REJECTED: "거절",
};

const REFUND_STATUS_LABEL = {
  REQUESTED: "환불 요청",
  APPROVED: "환불 승인",
  REJECTED: "환불 거절",
  REFUNDED: "환불 완료",
};

const PET_BREED_LABEL = {
  DOG: "강아지",
  CAT: "고양이",
  OTHER: "기타",
};

const PET_WEIGHT_LABEL = {
  XS: "초소형",
  S: "소형",
  M: "중형",
  L: "대형",
  XL: "초대형",
};

const INTEREST_NAME_LABEL = {
  EVENT: "행사",
  SESSION: "세션",
  EXPERIENCE: "체험",
  BOOTH: "부스",
  CONTEST: "콘테스트",
  NOTICE: "공지",
  SNACK: "간식",
  BATH_SUPPLIES: "목욕용품",
  GROOMING: "미용",
  TOY: "장난감",
  CLOTHING: "의류",
  HEALTH: "건강",
  TRAINING: "훈련",
  WALK: "산책",
  SUPPLEMENTS: "영양제",
  ACCESSORIES: "액세서리",
  OTHERS: "기타",
};

const INTEREST_ICON = {
  EVENT: PartyPopper,
  SESSION: Presentation,
  EXPERIENCE: Compass,
  BOOTH: Store,
  CONTEST: Trophy,
  NOTICE: Megaphone,
  SNACK: Cookie,
  BATH_SUPPLIES: Bath,
  GROOMING: Scissors,
  TOY: Puzzle,
  CLOTHING: Shirt,
  HEALTH: HeartPulse,
  TRAINING: GraduationCap,
  WALK: Footprints,
  SUPPLEMENTS: Pill,
  ACCESSORIES: Watch,
  OTHERS: MoreHorizontal,
};

// 관심 구독: 주제마다 무엇을 알려주는지 한 줄 설명
const INTEREST_DESC = {
  EVENT: "새 행사가 열리거나 참가 신청이 시작되면 알려줘요",
  SESSION: "연사 강연·세미나 일정이 올라오면 알려줘요",
  EXPERIENCE: "반려동물과 함께하는 체험 프로그램 소식을 보내드려요",
  BOOTH: "행사장 부스와 참여 브랜드 소식을 보내드려요",
  CONTEST: "콘테스트 참가 모집과 투표 시작을 알려줘요",
  NOTICE: "운영 공지와 일정 변경을 빠르게 알려줘요",
  SNACK: "간식 신제품과 할인 소식을 보내드려요",
  BATH_SUPPLIES: "샴푸·목욕용품 신제품과 할인 소식을 보내드려요",
  GROOMING: "미용·그루밍 관련 소식을 보내드려요",
  TOY: "장난감 신제품 소식을 보내드려요",
  CLOTHING: "반려동물 의류 소식을 보내드려요",
  HEALTH: "건강·병원 관련 소식을 보내드려요",
  TRAINING: "훈련·교육 프로그램 소식을 보내드려요",
  WALK: "산책 용품과 산책 모임 소식을 보내드려요",
  SUPPLEMENTS: "영양제 신제품과 할인 소식을 보내드려요",
  ACCESSORIES: "액세서리 신제품 소식을 보내드려요",
  OTHERS: "그 밖의 반려생활 소식을 보내드려요",
};
const INTEREST_GROUPS = [
  { key: "event", title: "행사 소식", note: "행사·프로그램 일정 알림", names: ["EVENT", "SESSION", "EXPERIENCE", "BOOTH", "CONTEST", "NOTICE"] },
  { key: "goods", title: "반려용품 소식", note: "용품 신제품·할인 알림", names: null },
];
const INTEREST_SAMPLES = [
  { name: "EVENT", text: "부산 펫 페어 참가 신청이 열렸어요" },
  { name: "CONTEST", text: "고양이 민첩성 대회 투표가 시작됐어요" },
  { name: "NOTICE", text: "코리아 펫 엑스포 운영 시간이 바뀌었어요" },
  { name: "SNACK", text: "새로 나온 수제 간식 할인 소식이 있어요" },
];

const SUBSCRIPTION_CHANNEL_OPTIONS = [
  { key: "allowInapp", label: "앱" },
  { key: "allowEmail", label: "이메일" },
  { key: "allowSms", label: "문자" },
];

function fmtDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

function fmtDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${day} ${hh}:${mm}`;
}

function fmtRelative(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return fmtDateTime(value);
}

function resolveNotificationTargetPath(targetType, targetId) {
  if (targetType === "EVENT") return "/event/current";
  if (targetType === "NOTICE" && targetId != null) {
    return `/community/notice/${targetId}`;
  }
  return null;
}

function getNotificationTargetPath(notification) {
  if (!notification) return null;
  if (notification.canNavigate === false) return null;
  return notification.targetPath || resolveNotificationTargetPath(notification.targetType, notification.targetId);
}

function statusClass(status) {
  const key = String(status || "").toUpperCase();
  if (key === "APPLIED") return "applied";
  if (key === "APPROVED") return "approved";
  if (key === "CANCELLED") return "cancelled";
  if (key === "REFUND_REQUESTED") return "refund-requested";
  if (key === "REFUND_APPROVED") return "refund-approved";
  if (key === "REFUND_REJECTED") return "refund-rejected";
  if (key === "REFUNDED") return "refunded";
  return "rejected";
}

function toInitial(name, email) {
  const source = String(name || "").trim() || String(email || "").trim() || "U";
  return source[0].toUpperCase();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatPetBreed(value) {
  const key = String(value || "").toUpperCase();
  return PET_BREED_LABEL[key] || value || "-";
}

function formatPetWeight(value) {
  const key = String(value || "").toUpperCase();
  return PET_WEIGHT_LABEL[key] || value || "-";
}

function interestLabel(name) {
  return INTEREST_NAME_LABEL[String(name || "").toUpperCase()] || String(name || "기타");
}

function resolveChannelOptions(source, draft) {
  return {
    allowInapp: draft?.allowInapp ?? source?.allowInapp ?? true,
    allowEmail: draft?.allowEmail ?? source?.allowEmail ?? false,
    allowSms: draft?.allowSms ?? source?.allowSms ?? false,
  };
}

function buildRefundMap(rows) {
  return safeArray(rows).reduce((acc, row) => {
    const applyId = row?.eventApplyId;
    if (applyId == null) return acc;
    acc[String(applyId)] = row;
    return acc;
  }, {});
}

function resolveRegistrationStatus(item, refundMap) {
  const refund = refundMap[String(item?.applyId)];
  const refundStatus = String(refund?.status || "").toUpperCase();

  if (refundStatus && REFUND_STATUS_LABEL[refundStatus]) {
    return {
      badgeStatus: refundStatus === "REFUNDED" ? "REFUNDED" : `REFUND_${refundStatus}`,
      label: REFUND_STATUS_LABEL[refundStatus],
    };
  }

  const status = String(item?.status || "").toUpperCase();
  return {
    badgeStatus: status,
    label: REG_STATUS_LABEL[status] || status || "-",
  };
}

export default function MyPage() {
  const navigate = useNavigate();

  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  useEffect(() => {
    const sync = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);
  const isMobile = viewportWidth < 768;

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Calendar state
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calSelected, setCalSelected] = useState(now.getDate());

  const [profile, setProfile] = useState(null);
  const [pets, setPets] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [eventMap, setEventMap] = useState({});
  const [participations, setParticipations] = useState([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [deletingInboxIds, setDeletingInboxIds] = useState([]);
  const [movingInboxIds, setMovingInboxIds] = useState([]);
  const [interests, setInterests] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionError, setSubscriptionError] = useState("");
  const [subscriptionSavingMap, setSubscriptionSavingMap] = useState({});
  const [channelDraftMap, setChannelDraftMap] = useState({});

  const [qrEventId, setQrEventId] = useState("");
  // 관심 구독 확인 창 { row, confirmUnsub } / 완료 안내
  const [subDialog, setSubDialog] = useState(null);
  const [subToast, setSubToast] = useState("");
  useEffect(() => {
    if (!subToast) return undefined;
    const timer = setTimeout(() => setSubToast(""), 2400);
    return () => clearTimeout(timer);
  }, [subToast]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleUnreadCountChange = (event) => {
      const nextCount = Number(event?.detail?.count);
      if (Number.isFinite(nextCount)) {
        setUnreadCount(Math.max(0, nextCount));
      }
    };
    window.addEventListener(
      NOTIFICATION_UNREAD_COUNT_EVENT,
      handleUnreadCountChange,
    );
    return () => {
      window.removeEventListener(
        NOTIFICATION_UNREAD_COUNT_EVENT,
        handleUnreadCountChange,
      );
    };
  }, []);

  const refreshSubscriptions = useCallback(async () => {
    const rows = await interestApi.getMySubscriptions(false);
    setSubscriptions(safeArray(rows));
  }, []);

  const loadEventDetails = useCallback(async (ids) => {
    const eventIds = [...new Set(safeArray(ids).filter(Boolean))];
    if (eventIds.length === 0) return {};

    const results = await Promise.all(
      eventIds.map(async (eventId) => {
        try {
          const res = await eventApi.getEventDetail(eventId);
          return [String(eventId), res?.data?.data || null];
        } catch {
          return [String(eventId), null];
        }
      }),
    );

    return Object.fromEntries(results);
  }, []);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLoading(true);
      setError("");

      const [
        meRes,
        petsRes,
        regRes,
        refundRes,
        visitRes,
        inboxRes,
        unreadRes,
        interestsRes,
        subscriptionsRes,
      ] = await Promise.allSettled([
        mypageApi.getMe(),
        mypageApi.getMyPets(),
        mypageApi.getMyEventRegistrations({ page: 0, size: 200 }),
        mypageApi.getMyRefunds({ page: 0, size: 200 }),
        mypageApi.getMyBoothVisitsGroupedByEvent(),
        notificationApi.getInbox(0, 20),
        notificationApi.getUnreadCount(),
        interestApi.listAll(),
        interestApi.getMySubscriptions(false),
      ]);

      if (!mounted) return;

      const me = meRes.status === "fulfilled" ? meRes.value : null;
      const petRows = safeArray(petsRes.status === "fulfilled" ? petsRes.value : []).sort((a, b) => {
        return Number(a?.petId || 0) - Number(b?.petId || 0);
      });
      const regPage = regRes.status === "fulfilled" ? regRes.value : null;
      const refundPage = refundRes.status === "fulfilled" ? refundRes.value : null;
      const visitGroups = visitRes.status === "fulfilled" ? visitRes.value : [];
      const inboxData = inboxRes.status === "fulfilled" ? inboxRes.value : null;
      const unread = unreadRes.status === "fulfilled" ? Number(unreadRes.value) || 0 : 0;
      const interestRows = interestsRes.status === "fulfilled" ? safeArray(interestsRes.value) : [];
      const subscriptionRows =
        subscriptionsRes.status === "fulfilled"
          ? safeArray(subscriptionsRes.value)
          : [];

      if (me) {
        setProfile({
          userId: me.userId,
          nickname: me.nickname || "회원",
          email: me.email || "-",
          createdAt: me.createdAt,
        });
      } else {
        setProfile({ userId: null, nickname: "회원", email: "-", createdAt: null });
      }

      setPets(petRows);

      const regRows = safeArray(regPage?.content).sort((a, b) => {
        const aa = new Date(a?.appliedAt || 0).getTime();
        const bb = new Date(b?.appliedAt || 0).getTime();
        return bb - aa;
      });
      setRegistrations(regRows);
      setRefunds(safeArray(refundPage?.content));

      const mappedParticipations = safeArray(visitGroups)
        .map((group) => {
          const booths = safeArray(group?.booths);
          const totalVisits = booths.reduce((sum, booth) => sum + (Number(booth?.visitCount) || 0), 0);
          const lastVisitedAt = booths.reduce((latest, booth) => {
            const current = booth?.lastVisitedAt;
            if (!current) return latest;
            if (!latest) return current;
            return new Date(current).getTime() > new Date(latest).getTime() ? current : latest;
          }, null);

          return {
            eventId: group?.eventId,
            eventName: group?.eventName,
            boothCount: booths.length,
            totalVisits,
            lastVisitedAt,
          };
        })
        .filter((item) => item.eventId && item.totalVisits > 0)
        .sort((a, b) => {
          const aa = new Date(a?.lastVisitedAt || 0).getTime();
          const bb = new Date(b?.lastVisitedAt || 0).getTime();
          return bb - aa;
        });
      setParticipations(mappedParticipations);

      const eventIds = [
        ...regRows.map((row) => row?.eventId),
        ...mappedParticipations.map((row) => row?.eventId),
      ];
      const detailMap = await loadEventDetails(eventIds);
      if (!mounted) return;
      setEventMap(detailMap);

      let inboxItems = safeArray(inboxData?.items);
      const inboxTotalPages = Number(inboxData?.totalPages) || 1;
      if (inboxTotalPages > 1) {
        try {
          const rest = await Promise.all(
            Array.from({ length: inboxTotalPages - 1 }, (_, idx) =>
              notificationApi.getInbox(idx + 1, 20),
            ),
          );
          rest.forEach((pageData) => {
            inboxItems.push(...safeArray(pageData?.items));
          });
        } catch {
          // 첫 페이지 데이터는 이미 확보했으므로 추가 페이지 실패는 무시한다.
        }
      }
      setNotifications(inboxItems);
      const nextUnreadCount = Number.isFinite(unread)
        ? unread
        : inboxItems.length;
      setUnreadCount(nextUnreadCount);
      emitNotificationUnreadCount(nextUnreadCount);
      setInterests(interestRows);
      setSubscriptions(subscriptionRows);
      if (
        interestsRes.status === "rejected" ||
        subscriptionsRes.status === "rejected"
      ) {
        setSubscriptionError("구독 정보를 일부 불러오지 못했습니다.");
      } else {
        setSubscriptionError("");
      }

      if (me?.userId != null) {
        try {
          const reviewPage = await reviewApi.list({
            page: 0,
            size: 1,
            searchType: "WRITER",
            keyword: String(me.userId),
          });
          if (!mounted) return;
          const total = Number(reviewPage?.totalElements);
          setReviewCount(Number.isFinite(total) ? total : safeArray(reviewPage?.content).length);
        } catch {
          if (!mounted) return;
          setReviewCount(0);
        }
      } else {
        setReviewCount(0);
      }

      const firstQrEvent = regRows.find((row) => {
        const s = String(row?.status || "").toUpperCase();
        return row?.eventId && s === "APPROVED";
      });
      if (firstQrEvent?.eventId) {
        setQrEventId(String(firstQrEvent.eventId));
      }

      if (
        meRes.status === "rejected" ||
        regRes.status === "rejected" ||
        refundRes.status === "rejected"
      ) {
        setError("일부 데이터를 불러오지 못했습니다. 다시 시도해 주세요.");
      }

      setLoading(false);
    };

    run().catch(() => {
      if (!mounted) return;
      setError("마이페이지 데이터를 불러오는 중 오류가 발생했습니다.");
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [loadEventDetails]);

  const refundMap = useMemo(() => buildRefundMap(refunds), [refunds]);

  const qrCandidates = useMemo(
    () =>
      registrations.filter((item) => {
        const status = String(item?.status || "").toUpperCase();
        return item?.eventId && status === "APPROVED";
      }),
    [registrations],
  );

  const statRequested = registrations.length;
  const statCompleted = participations.length;
  const statQrUsed = participations.reduce(
    (sum, item) => sum + (Number(item?.totalVisits) || 0),
    0,
  );

  const recentRegistrations = useMemo(() => {
    return registrations.slice(0, 3).map((item) => {
      const detail = eventMap[String(item?.eventId)] || {};
      return {
        ...item,
        refundStatus: refundMap[String(item?.applyId)]?.status || null,
        eventName: item?.eventName || detail?.eventName || "행사 정보 없음",
        location: detail?.location || "장소 정보 없음",
        startAt: detail?.startAt,
      };
    });
  }, [eventMap, refundMap, registrations]);

  // Calendar events derived from registrations (real DB data)
  const calEvents = useMemo(() => {
    const events = [];
    registrations.forEach((item) => {
      const detail = eventMap[String(item?.eventId)] || {};
      const status = String(item?.status || "").toUpperCase();
      const startAt = detail?.startAt;
      const endAt = detail?.endAt;
      if (!startAt) return;

      // Add event start date
      const d = new Date(startAt);
      if (Number.isNaN(d.getTime())) return;
      const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      const hh = String(d.getHours()).padStart(2,"0");
      const mm = String(d.getMinutes()).padStart(2,"0");
      const evName = item?.eventName || detail?.eventName || "행사";
      const statusLabel = status === "APPROVED" ? "승인" : status === "APPLIED" ? "신청" : status === "CANCELLED" ? "취소" : "";
      events.push({
        date: dateStr,
        name: evName,
        time: `${hh}:${mm}`,
        status: statusLabel,
        location: detail?.location || "",
      });

      // If multi-day event, add end date too
      if (endAt) {
        const d2 = new Date(endAt);
        if (!Number.isNaN(d2.getTime())) {
          const dateStr2 = `${d2.getFullYear()}-${String(d2.getMonth()+1).padStart(2,"0")}-${String(d2.getDate()).padStart(2,"0")}`;
          if (dateStr2 !== dateStr) {
            events.push({
              date: dateStr2,
              name: `${evName} (마감)`,
              time: `${String(d2.getHours()).padStart(2,"0")}:${String(d2.getMinutes()).padStart(2,"0")}`,
              status: statusLabel,
              location: detail?.location || "",
            });
          }
        }
      }
    });
    return events;
  }, [registrations, eventMap]);

  const participationRows = useMemo(() => {
    return participations.map((item) => {
      const detail = eventMap[String(item?.eventId)] || {};
      return {
        ...item,
        eventName: item?.eventName || detail?.eventName || "행사 정보 없음",
        location: detail?.location || "장소 정보 없음",
      };
    });
  }, [participations, eventMap]);

  const activeSubscriptions = useMemo(
    () =>
      subscriptions.filter(
        (row) => String(row?.status || "").toUpperCase() === "ACTIVE",
      ),
    [subscriptions],
  );

  const activeSubscriptionMap = useMemo(() => {
    const map = new Map();
    activeSubscriptions.forEach((row) => {
      const interestId = Number(row?.interestId);
      if (Number.isFinite(interestId)) {
        map.set(interestId, row);
      }
    });
    return map;
  }, [activeSubscriptions]);

  const availableInterests = useMemo(
    () =>
      interests.filter((row) => {
        const interestId = Number(row?.interestId);
        const isActive = row?.isActive !== false;
        return Number.isFinite(interestId) && isActive && !activeSubscriptionMap.has(interestId);
      }),
    [interests, activeSubscriptionMap],
  );

  const getChannelOptions = useCallback(
    (interestId, source) =>
      resolveChannelOptions(source, channelDraftMap[interestId]),
    [channelDraftMap],
  );

  const setChannelOptions = useCallback((interestId, source, updater) => {
    setChannelDraftMap((prev) => {
      const base = resolveChannelOptions(source, prev[interestId]);
      const next =
        typeof updater === "function" ? updater(base) : updater;
      return {
        ...prev,
        [interestId]: next,
      };
    });
  }, []);

  const openQrCheckin = () => {
    const nextEventId = qrEventId || String(qrCandidates[0]?.eventId || "");
    navigate(
      nextEventId
        ? `/registration/qrcheckin?eventId=${nextEventId}`
        : "/registration/qrcheckin",
    );
  };

  const moveToEventPage = (eventId) => {
    if (!eventId) return;
    navigate(`/program/current`);
  };

  const removeNotificationFromInbox = useCallback((inboxId) => {
    setNotifications((prev) =>
      prev.filter((item) => Number(item?.inboxId) !== Number(inboxId)),
    );
    setUnreadCount((prev) => {
      const next = Math.max(0, (Number(prev) || 0) - 1);
      emitNotificationUnreadCount(next);
      return next;
    });
  }, []);

  const handleDeleteNotification = useCallback(
    async (inboxId) => {
      if (inboxId == null || deletingInboxIds.includes(inboxId)) return;

      setDeletingInboxIds((prev) => [...prev, inboxId]);
      setError("");

      try {
        await notificationApi.delete(inboxId);
        removeNotificationFromInbox(inboxId);
      } catch (e) {
        setError(e?.message || "알림 삭제에 실패했습니다.");
      } finally {
        setDeletingInboxIds((prev) => prev.filter((id) => id !== inboxId));
      }
    },
    [deletingInboxIds, removeNotificationFromInbox],
  );

  const handleMoveNotification = useCallback(
    async (notification) => {
      const inboxId = notification?.inboxId;
      const fallbackPath = resolveNotificationTargetPath(
        notification?.targetType,
        notification?.targetId,
      );
      const targetPath = getNotificationTargetPath(notification) || fallbackPath;

      if (
        inboxId == null ||
        !targetPath ||
        movingInboxIds.includes(inboxId)
      ) {
        return;
      }

      setMovingInboxIds((prev) => [...prev, inboxId]);
      setError("");

      try {
        // 이동은 클릭 API를 사용해 서버에서 읽음 처리 후 목적지 정보를 돌려받는다.
        const res = await notificationApi.click(inboxId);
        removeNotificationFromInbox(inboxId);
        const nextTargetPath =
          resolveNotificationTargetPath(res?.targetType, res?.targetId) || targetPath;
        if (nextTargetPath) navigate(nextTargetPath);
      } catch (e) {
        setError(e?.message || "알림 이동에 실패했습니다.");
      } finally {
        setMovingInboxIds((prev) => prev.filter((id) => id !== inboxId));
      }
    },
    [movingInboxIds, navigate, removeNotificationFromInbox],
  );

  const setSubscriptionSaving = useCallback((interestId, saving) => {
    setSubscriptionSavingMap((prev) => ({
      ...prev,
      [interestId]: saving,
    }));
  }, []);

  const handleSubscribeInterest = useCallback(
    async (interestId, source) => {
      if (interestId == null) return;
      const channelOptions = getChannelOptions(interestId, source);
      setSubscriptionSaving(interestId, true);
      setSubscriptionError("");
      try {
        await interestApi.subscribe({
          interestId,
          ...channelOptions,
        });
        await refreshSubscriptions();
        return true;
      } catch (e) {
        setSubscriptionError(
          e?.response?.data?.message ||
            e?.message ||
            "구독 처리에 실패했습니다.",
        );
        return false;
      } finally {
        setSubscriptionSaving(interestId, false);
      }
    },
    [getChannelOptions, refreshSubscriptions, setSubscriptionSaving],
  );

  const handleUnsubscribeInterest = useCallback(
    async (interestId) => {
      if (interestId == null) return;
      setSubscriptionSaving(interestId, true);
      setSubscriptionError("");
      try {
        await interestApi.unsubscribe(interestId);
        await refreshSubscriptions();
        return true;
      } catch (e) {
        setSubscriptionError(
          e?.response?.data?.message ||
            e?.message ||
            "구독 해지에 실패했습니다.",
        );
        return false;
      } finally {
        setSubscriptionSaving(interestId, false);
      }
    },
    [refreshSubscriptions, setSubscriptionSaving],
  );

  const handleToggleSubscriptionChannel = useCallback(
    async (row, channelKey) => {
      const interestId = Number(row?.interestId);
      if (!Number.isFinite(interestId) || !channelKey) return;

      const currentOptions = getChannelOptions(interestId, row);
      const nextOptions = {
        ...currentOptions,
        [channelKey]: !currentOptions[channelKey],
      };

      setChannelOptions(interestId, row, nextOptions);
      setSubscriptionSaving(interestId, true);
      setSubscriptionError("");

      try {
        await interestApi.updateChannels({
          interestId,
          ...nextOptions,
        });
        await refreshSubscriptions();
      } catch (e) {
        setChannelOptions(interestId, row, currentOptions);
        setSubscriptionError(
          e?.response?.data?.message ||
            e?.message ||
            "알림 채널 변경에 실패했습니다.",
        );
      } finally {
        setSubscriptionSaving(interestId, false);
      }
    },
    [
      getChannelOptions,
      refreshSubscriptions,
      setChannelOptions,
      setSubscriptionSaving,
    ],
  );

  const renderRegistrationItem = (item, clickable = false, isMain = false) => {
    const detail = eventMap[String(item?.eventId)] || {};
    const { badgeStatus, label } = resolveRegistrationStatus(item, refundMap);

    return (
      <div
        className={`mp-item${clickable ? " clickable" : ""}${isMain ? " mp-item-main" : ""}`}
        key={`${item?.applyId}-${item?.eventId}`}
        onClick={clickable ? () => moveToEventPage(item?.eventId) : undefined}
      >
        <div className="mp-item-top">
          <div className="mp-item-title">{item?.eventName || detail?.eventName || "행사 정보 없음"}</div>
          <span className={`mp-badge ${statusClass(badgeStatus)}`}>{label}</span>
        </div>
        <div className="mp-item-meta">
          <span>신청일 {fmtDateTime(item?.appliedAt)}</span>
          <span>일정 {fmtDate(detail?.startAt)}</span>
          <span>{detail?.location || "장소 정보 없음"}</span>
        </div>
      </div>
    );
  };

  const renderNotificationItem = (noti, withAbsoluteTime = false) => {
    const inboxId = noti?.inboxId;
    const isDeleting = deletingInboxIds.includes(inboxId);
    const isMoving = movingInboxIds.includes(inboxId);
    const canMove = Boolean(getNotificationTargetPath(noti));

    return (
      <div className="mp-item" key={inboxId || `${noti?.title}-${noti?.receivedAt}`}>
        <div className="mp-noti-header">
          <div className="mp-noti-title">{noti?.title || "알림"}</div>
          <div className="mp-noti-actions">
            {canMove ? (
              <button
                type="button"
                className="mp-noti-action move"
                onClick={() => handleMoveNotification(noti)}
                disabled={isDeleting || isMoving}
              >
                {isMoving ? "이동 중" : "이동"}
              </button>
            ) : null}
            <button
              type="button"
              className="mp-noti-action delete"
              onClick={() => handleDeleteNotification(inboxId)}
              disabled={isDeleting || isMoving}
            >
              {isDeleting ? "삭제 중" : "삭제"}
            </button>
          </div>
        </div>
        <div className="mp-noti-content">{noti?.content || "-"}</div>
        <div className="mp-noti-time">
          {withAbsoluteTime
            ? `수신 ${fmtDateTime(noti?.receivedAt)}`
            : fmtRelative(noti?.receivedAt)}
        </div>
      </div>
    );
  };

  /* ── 화면 ── */
  const MP_TABS = [
    { key: "overview", label: "한눈에 보기" },
    { key: "events", label: "신청 행사" },
    { key: "history", label: "참여 기록" },
    { key: "pets", label: "반려동물" },
    { key: "notifications", label: "알림", badge: unreadCount },
    { key: "interests", label: "관심 구독" },
  ];

  // 신청 행사: 참가 신청 화면과 같은 말(결제 대기 / 참가 확정)로 보여준다
  const regView = (item) => {
    const detail = eventMap[String(item?.eventId)] || {};
    const { badgeStatus, label } = resolveRegistrationStatus(item, refundMap);
    const tone = badgeStatus === "APPROVED" ? "ok" : badgeStatus === "APPLIED" ? "wait" : "off";
    const text = badgeStatus === "APPROVED" ? "참가 확정" : badgeStatus === "APPLIED" ? "결제 대기" : label;
    const start = detail?.startAt ? new Date(detail.startAt) : null;
    const end = detail?.endAt ? new Date(detail.endAt) : null;
    const nowMs = Date.now();
    let dday = { text: "", cls: "" };
    if (start && end) {
      if (nowMs < start.getTime()) {
        const days = Math.ceil((new Date(start.toDateString()) - new Date(new Date().toDateString())) / 86400000);
        dday = { text: days === 0 ? "D-DAY" : `D-${days}`, cls: "" };
      } else if (nowMs <= end.getTime()) dday = { text: "진행 중", cls: "live" };
      else dday = { text: "종료", cls: "past" };
    }
    return {
      key: `${item?.applyId}-${item?.eventId}`,
      eventId: item?.eventId,
      name: item?.eventName || detail?.eventName || "행사 정보 없음",
      place: detail?.location || "",
      period: detail?.startAt ? `${fmtDate(detail.startAt)} ~ ${fmtDate(detail.endAt)}` : "일정 미정",
      appliedAt: item?.appliedAt,
      image: detail?.imageUrl ? toPublicAssetUrl(detail.imageUrl) : "",
      baseFee: Number(detail?.baseFee ?? 0),
      status: badgeStatus, tone, text, dday,
      endMs: end ? end.getTime() : 0, startMs: start ? start.getTime() : 0,
    };
  };
  const regRows = registrations.map(regView);
  const upcoming = regRows
    .filter((r) => r.tone !== "off" && r.endMs >= Date.now())
    .sort((a, b) => a.startMs - b.startMs)
    .slice(0, 4);

  const goCheckout = (r) => {
    const params = new URLSearchParams({ eventId: String(r.eventId), amount: String(r.baseFee || 0), title: r.name, returnUrl: "/mypage" });
    navigate(`/payment/checkout?${params.toString()}`);
  };

  const regAction = (r) => {
    if (r.status === "APPROVED") return <button type="button" className="mp-btn sm" onClick={() => navigate(`/registration/qrcheckin?eventId=${r.eventId}`)}><QrCode size={16} />입장 QR</button>;
    if (r.status === "APPLIED") return <button type="button" className="mp-btn sm dark" onClick={() => goCheckout(r)}>결제하기</button>;
    return null;
  };

  const notiRow = (noti, absolute = false) => {
    const inboxId = noti?.inboxId;
    const busy = deletingInboxIds.includes(inboxId) || movingInboxIds.includes(inboxId);
    const canMove = Boolean(getNotificationTargetPath(noti));
    return (
      <li className="mp-row" key={inboxId || `${noti?.title}-${noti?.receivedAt}`}>
        <div>
          <div className="mp-row-name" style={{ fontSize: 16 }}>{noti?.title || "알림"}</div>
          {noti?.content ? <div className="mp-row-sub">{noti.content}</div> : null}
          <div className="mp-row-sub" style={{ color: "var(--mute)" }}>{absolute ? fmtDateTime(noti?.receivedAt) : fmtRelative(noti?.receivedAt)}</div>
        </div>
        <div className="mp-row-end">
          {canMove ? <button type="button" className="mp-link-btn" disabled={busy} onClick={() => handleMoveNotification(noti)}>보기</button> : null}
          <button type="button" className="mp-link-btn" disabled={busy} onClick={() => handleDeleteNotification(inboxId)}>삭제</button>
        </div>
      </li>
    );
  };

  const petInfo = (pet) => [formatPetBreed(pet?.petBreed), pet?.petAge != null ? `${pet.petAge}살` : null, formatPetWeight(pet?.petWeight)].filter(Boolean).join(" · ");
  const empty = (title, desc, action) => (
    <div className="mp-empty"><strong>{title}</strong>{desc}{action ? <div style={{ marginTop: 14 }}>{action}</div> : null}</div>
  );

  return (
    <div className="mp">
      <style>{styles}</style>
      <main className="mp-wrap">
        {/* 프로필 */}
        <section className="mp-profile">
          <div className="mp-me">
            <div className="mp-avatar">{toInitial(profile?.nickname, profile?.email)}</div>
            <div style={{ minWidth: 0 }}>
              <p className="mp-hello">마이페이지</p>
              <h1 className="mp-name">{profile?.nickname || "회원"}님</h1>
              <p className="mp-meta">
                <span>{profile?.email || "-"}</span>
                {profile?.createdAt ? <span>{fmtDate(profile.createdAt)} 가입</span> : null}
              </p>
            </div>
          </div>
          <div className="mp-actions">
            <button type="button" className="mp-btn" onClick={() => navigate("/mypage/profile")}><Settings size={17} />회원정보 수정</button>
            <button type="button" className="mp-btn dark" onClick={openQrCheckin}><QrCode size={17} />내 입장 QR</button>
          </div>
        </section>

        {/* 탭 */}
        <nav className="mp-tabs" aria-label="마이페이지 메뉴">
          {MP_TABS.map((t) => (
            <button key={t.key} type="button" className={`mp-tab${activeTab === t.key ? " on" : ""}`} onClick={() => setActiveTab(t.key)}>
              {t.label}{t.badge > 0 ? <em>{t.badge > 99 ? "99+" : t.badge}</em> : null}
            </button>
          ))}
        </nav>

        {error ? <div className="mp-alert"><AlertCircle size={16} />{error}</div> : null}

        {/* 한눈에 보기 */}
        {activeTab === "overview" ? (
          <div className="mp-stack">
            <div className="mp-stats">
              {[
                { label: "신청 행사", value: statRequested, unit: "건", tab: "events" },
                { label: "참여 완료", value: statCompleted, unit: "건", tab: "history" },
                { label: "입장 기록", value: statQrUsed, unit: "회", tab: "history" },
                { label: "작성 후기", value: reviewCount, unit: "개", tab: null },
              ].map((s) => (
                <button key={s.label} type="button" className="mp-stat" onClick={() => (s.tab ? setActiveTab(s.tab) : navigate("/community/review"))}>
                  <div className="mp-stat-label">{s.label}</div>
                  <div className="mp-stat-value">{loading ? "–" : s.value}<small>{s.unit}</small></div>
                </button>
              ))}
            </div>

            <div className="mp-grid">
              <section className="mp-panel">
                <div className="mp-head">
                  <div>
                    <h2 className="mp-title">다가오는 일정</h2>
                    <p className="mp-note">신청한 행사 중 아직 끝나지 않은 일정이에요.</p>
                  </div>
                  <button type="button" className="mp-more" onClick={() => setActiveTab("events")}>전체 보기<ChevronRight size={16} /></button>
                </div>
                {upcoming.length === 0 ? empty("다가오는 일정이 없어요", "관심 있는 행사에 참가 신청해 보세요.", <button type="button" className="mp-btn sm" onClick={() => navigate("/registration/apply")}>행사 둘러보기</button>) : (
                  <ul className="mp-list">
                    {upcoming.map((r) => (
                      <li key={r.key} className="mp-row">
                        <div>
                          <span className={`mp-state ${r.tone}`}><i />{r.text}</span>
                          <div className="mp-row-name" style={{ marginTop: 6 }}>{r.name}</div>
                          <div className="mp-row-sub">{[r.period, r.place].filter(Boolean).join(" · ")}</div>
                        </div>
                        <div className="mp-row-end">
                          <span className={`mp-dday ${r.dday.cls}`}>{r.dday.text}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <div className="mp-stack">
                <section className="mp-panel">
                  <div className="mp-head">
                    <h2 className="mp-title">반려동물</h2>
                    <button type="button" className="mp-more" onClick={() => setActiveTab("pets")}>관리<ChevronRight size={16} /></button>
                  </div>
                  {pets.length === 0 ? empty("등록된 반려동물이 없어요", "반려동물을 등록하면 행사 신청이 빨라져요.", <button type="button" className="mp-btn sm" onClick={() => navigate("/mypage/pets/new")}>반려동물 등록</button>) : (
                    <div>
                      {pets.slice(0, 3).map((pet) => (
                        <div key={pet?.petId} className="mp-pet-row">
                          <PetAvatar src={pet?.imageUrl} name={pet?.petName} size={48} background="#f1f6ea" iconColor="#5E8F2A" />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="mp-row-name" style={{ fontSize: 16 }}>{pet?.petName || "이름 없음"}</div>
                            <div className="mp-row-sub" style={{ marginTop: 2 }}>{petInfo(pet)}</div>
                          </div>
                          <button type="button" className="mp-link-btn" onClick={() => navigate(`/mypage/pets/${pet?.petId}/edit`)}>수정</button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="mp-panel">
                  <div className="mp-head">
                    <h2 className="mp-title">최근 알림</h2>
                    <button type="button" className="mp-more" onClick={() => setActiveTab("notifications")}>전체 보기<ChevronRight size={16} /></button>
                  </div>
                  {notifications.length === 0 ? empty("새 알림이 없어요", "결제·행사 소식이 오면 여기에 모여요.") : (
                    <ul className="mp-list">{notifications.slice(0, 3).map((n) => notiRow(n))}</ul>
                  )}
                </section>
              </div>
            </div>
          </div>
        ) : null}

        {/* 신청 행사 */}
        {activeTab === "events" ? (
          <section className="mp-panel">
            <div className="mp-head">
              <div>
                <h2 className="mp-title">신청 행사 <span style={{ color: "var(--mute)", fontWeight: 700 }}>{regRows.length}</span></h2>
                <p className="mp-note">결제 대기 중인 행사는 결제를 마쳐야 참가가 확정돼요.</p>
              </div>
              <button type="button" className="mp-more" onClick={() => navigate("/registration/applyhistory")}>신청 내역 조회<ChevronRight size={16} /></button>
            </div>
            {regRows.length === 0 ? empty("신청한 행사가 없어요", "관심 있는 행사에 참가 신청해 보세요.", <button type="button" className="mp-btn sm" onClick={() => navigate("/registration/apply")}>행사 둘러보기</button>) : (
              <ul className="mp-list">
                {regRows.map((r) => (
                  <li key={r.key} className="mp-row with-thumb">
                    {r.image ? <img className="mp-thumb" src={r.image} alt="" /> : <span className="mp-thumb" />}
                    <div>
                      <span className={`mp-state ${r.tone}`}><i />{r.text}</span>
                      <div className="mp-row-name" style={{ marginTop: 6 }}>{r.name}</div>
                      <div className="mp-row-sub">{[r.period, r.place].filter(Boolean).join(" · ")}</div>
                      <div className="mp-row-sub" style={{ color: "var(--mute)" }}>신청 {fmtDateTime(r.appliedAt)}</div>
                    </div>
                    <div className="mp-row-end">
                      {r.dday.text && r.tone !== "off" ? <span className={`mp-dday ${r.dday.cls}`}>{r.dday.text}</span> : null}
                      {regAction(r)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {/* 참여 기록 */}
        {activeTab === "history" ? (
          <section className="mp-panel">
            <div className="mp-head">
              <div>
                <h2 className="mp-title">참여 기록 <span style={{ color: "var(--mute)", fontWeight: 700 }}>{participationRows.length}</span></h2>
                <p className="mp-note">입장 QR로 부스에 들른 기록이에요.</p>
              </div>
            </div>
            {participationRows.length === 0 ? empty("아직 참여 기록이 없어요", "행사장에서 입장 QR을 찍으면 방문 기록이 쌓여요.") : (
              <ul className="mp-list">
                {participationRows.map((row) => (
                  <li key={`history-${row.eventId}`} className="mp-row">
                    <div>
                      <div className="mp-row-name">{row.eventName}</div>
                      <div className="mp-row-sub">{[row.location, `최근 방문 ${fmtDateTime(row.lastVisitedAt)}`].filter(Boolean).join(" · ")}</div>
                    </div>
                    <div className="mp-row-end" style={{ textAlign: "right" }}>
                      <div>
                        <div className="mp-dday" style={{ minWidth: 0 }}>{row.totalVisits}회</div>
                        <div className="mp-row-sub" style={{ margin: 0 }}>부스 {row.boothCount}곳</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {/* 반려동물 */}
        {activeTab === "pets" ? (
          <section className="mp-panel">
            <div className="mp-head">
              <div>
                <h2 className="mp-title">반려동물 <span style={{ color: "var(--mute)", fontWeight: 700 }}>{pets.length}</span></h2>
                <p className="mp-note">콘테스트·체험 신청 때 등록한 반려동물을 바로 고를 수 있어요.</p>
              </div>
            </div>
            <div className="mp-pets">
              {pets.map((pet) => (
                <div key={pet?.petId} className="mp-pet">
                  <PetAvatar src={pet?.imageUrl} name={pet?.petName} size={96} radius={24} background="#f1f6ea" iconColor="#5E8F2A" />
                  <div className="mp-pet-name">{pet?.petName || "이름 없음"}</div>
                  <div className="mp-pet-info">{petInfo(pet)}</div>
                  <button type="button" className="mp-btn sm" onClick={() => navigate(`/mypage/pets/${pet?.petId}/edit`)}>정보 수정</button>
                </div>
              ))}
              <button type="button" className="mp-pet mp-pet-add" onClick={() => navigate("/mypage/pets/new")}>
                <PawPrint size={28} />반려동물 등록
              </button>
            </div>
          </section>
        ) : null}

        {/* 알림 */}
        {activeTab === "notifications" ? (
          <section className="mp-panel">
            <div className="mp-head">
              <div>
                <h2 className="mp-title">알림 <span style={{ color: "var(--mute)", fontWeight: 700 }}>{notifications.length}</span></h2>
                <p className="mp-note">보기를 누르면 관련 화면으로 이동하고 읽음 처리돼요.</p>
              </div>
            </div>
            {notifications.length === 0 ? empty("받은 알림이 없어요", "결제·행사 소식이 오면 여기에 모여요.") : (
              <ul className="mp-list">{notifications.map((n) => notiRow(n, true))}</ul>
            )}
          </section>
        ) : null}

        {/* 관심 구독 */}
        {activeTab === "interests" ? (() => {
          const rows = interests.filter((r) => r?.isActive !== false);
          const nameOf = (r) => String(r?.interestName || "").toUpperCase();
          const eventNames = INTEREST_GROUPS[0].names;
          const grouped = [
            { ...INTEREST_GROUPS[0], rows: rows.filter((r) => eventNames.includes(nameOf(r))) },
            { ...INTEREST_GROUPS[1], rows: rows.filter((r) => !eventNames.includes(nameOf(r))) },
          ].filter((g) => g.rows.length);
          const subscribedNames = new Set(rows.filter((r) => activeSubscriptionMap.has(Number(r?.interestId))).map(nameOf));
          const samples = INTEREST_SAMPLES.filter((smp) => rows.some((r) => nameOf(r) === smp.name));
          const channelSummary = (() => {
            const on = new Set();
            activeSubscriptions.forEach((sub) => {
              const opt = getChannelOptions(Number(sub?.interestId), sub);
              if (opt.allowInapp) on.add("앱 알림");
              if (opt.allowEmail) on.add("이메일");
              if (opt.allowSms) on.add("문자");
            });
            return [...on].join(" · ");
          })();

          return (
            <div className="mp-int">
              <section className="mp-panel">
                <div className="mp-head">
                  <div>
                    <h2 className="mp-title">관심 구독 <span style={{ color: "var(--mute)", fontWeight: 700 }}>{activeSubscriptions.length}</span></h2>
                    <p className="mp-note">관심 있는 주제를 고르면 새 소식을 알림으로 보내드려요. 카드를 누르면 구독하거나 관리할 수 있어요.</p>
                  </div>
                </div>
                {subscriptionError ? <div className="mp-alert"><AlertCircle size={16} />{subscriptionError}</div> : null}
                {rows.length === 0 ? empty("구독할 수 있는 주제가 없어요", "잠시 후 다시 확인해 주세요.") : grouped.map((g) => (
                  <div key={g.key} className="mp-int-group">
                    <div className="mp-int-group-head">
                      <h3>{g.title}</h3>
                      <span>{g.note}</span>
                    </div>
                    <div className="mp-int-grid">
                      {g.rows.map((row) => {
                        const interestId = Number(row?.interestId);
                        const on = activeSubscriptionMap.has(interestId);
                        const saving = !!subscriptionSavingMap[interestId];
                        const IconComp = INTEREST_ICON[nameOf(row)] || Star;
                        return (
                          <button key={interestId} type="button" className={`mp-int-card${on ? " on" : ""}`} disabled={saving} onClick={() => setSubDialog({ row, confirmUnsub: false })}>
                            <span className="mp-int-icon"><IconComp size={24} strokeWidth={1.8} /></span>
                            <span className="mp-int-name">{interestLabel(row?.interestName)}</span>
                            <span className="mp-int-desc">{INTEREST_DESC[nameOf(row)] || "관련 소식을 보내드려요"}</span>
                            <span className={`mp-int-state${on ? " on" : ""}`}>
                              {on ? <><CheckCircle2 size={16} />구독 중</> : "+ 구독하기"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </section>

              <aside className="mp-int-side">
                <section className="mp-panel">
                  <h3 className="mp-title" style={{ fontSize: 18 }}>이런 알림이 와요</h3>
                  <p className="mp-note" style={{ marginBottom: 14 }}>구독한 주제의 새 소식이 오면 이렇게 알려드려요.</p>
                  <ul className="mp-int-samples">
                    {samples.map((smp) => {
                      const IconComp = INTEREST_ICON[smp.name] || Star;
                      const on = subscribedNames.has(smp.name);
                      return (
                        <li key={smp.name} className={on ? "on" : ""}>
                          <span className="mp-int-sample-icon"><Bell size={16} /></span>
                          <div>
                            <div className="mp-int-sample-text">{smp.text}</div>
                            <div className="mp-int-sample-tag"><IconComp size={13} />{interestLabel(smp.name)}{on ? " · 구독 중" : ""}</div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
                <section className="mp-panel mp-int-summary">
                  <div className="mp-int-summary-num">{activeSubscriptions.length}<small>개 구독 중</small></div>
                  <p className="mp-note" style={{ margin: 0 }}>
                    {activeSubscriptions.length ? `${channelSummary || "앱 알림"}으로 받고 있어요.` : "아직 구독한 주제가 없어요. 관심 있는 카드를 눌러 보세요."}
                  </p>
                  {activeSubscriptions.length ? (
                    <button type="button" className="mp-btn sm" style={{ marginTop: 14 }} onClick={() => setActiveTab("notifications")}>받은 알림 보기</button>
                  ) : null}
                </section>
              </aside>
            </div>
          );
        })() : null}
      </main>

      {subDialog ? (() => {
        const row = subDialog.row;
        const interestId = Number(row?.interestId);
        const subscribed = activeSubscriptionMap.get(interestId);
        const source = subscribed || row;
        const channels = getChannelOptions(interestId, source);
        const saving = !!subscriptionSavingMap[interestId];
        const label = interestLabel(row?.interestName);
        const IconComp = INTEREST_ICON[String(row?.interestName || "").toUpperCase()] || Star;
        const noChannel = !channels.allowInapp && !channels.allowEmail && !channels.allowSms;
        const toggleChannel = (key) => {
          if (subscribed) handleToggleSubscriptionChannel(subscribed, key);
          else setChannelOptions(interestId, row, { ...channels, [key]: !channels[key] });
        };
        const close = () => { if (!saving) setSubDialog(null); };
        return (
          <div className="mp-dim" onClick={close}>
            <div className="mp-dialog" role="dialog" aria-modal="true" aria-label={`${label} 구독`} onClick={(e) => e.stopPropagation()}>
              {subDialog.confirmUnsub ? (
                <>
                  <h3 className="mp-dialog-title">{label} 구독을 해지할까요?</h3>
                  <p className="mp-dialog-desc">해지하면 {label} 관련 새 소식 알림을 더 이상 받지 않아요. 언제든 다시 구독할 수 있어요.</p>
                  <div className="mp-dialog-actions">
                    <button type="button" className="mp-btn" onClick={() => setSubDialog({ row, confirmUnsub: false })} disabled={saving}>취소</button>
                    <button type="button" className="mp-btn danger" disabled={saving} onClick={async () => {
                      if (await handleUnsubscribeInterest(interestId)) { setSubDialog(null); setSubToast(`${label} 구독을 해지했어요`); }
                    }}>{saving ? "해지 중…" : "구독 해지"}</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mp-dialog-icon"><IconComp size={26} strokeWidth={1.8} /></div>
                  <h3 className="mp-dialog-title">{subscribed ? `${label} 구독 중이에요` : `${label} 소식을 받아볼까요?`}</h3>
                  <p className="mp-dialog-desc">{subscribed ? "받는 방법을 바꾸면 바로 저장돼요." : `새 ${label} 소식이 올라오면 알려드려요. 받을 방법을 골라 주세요.`}</p>
                  <div className="mp-channels">
                    {SUBSCRIPTION_CHANNEL_OPTIONS.map((opt) => (
                      <label key={opt.key} className={`mp-channel${channels[opt.key] ? " on" : ""}`}>
                        <input type="checkbox" checked={Boolean(channels[opt.key])} disabled={saving} onChange={() => toggleChannel(opt.key)} />
                        {opt.key === "allowInapp" ? "앱 알림" : opt.label}
                      </label>
                    ))}
                  </div>
                  {noChannel ? <p className="mp-dialog-warn">받을 방법을 하나 이상 골라 주세요.</p> : null}
                  {subscriptionError ? <p className="mp-dialog-warn">{subscriptionError}</p> : null}
                  <div className="mp-dialog-actions">
                    {subscribed ? (
                      <>
                        <button type="button" className="mp-btn" disabled={saving} onClick={() => setSubDialog({ row, confirmUnsub: true })}>구독 해지</button>
                        <button type="button" className="mp-btn dark" disabled={saving} onClick={close}>확인</button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="mp-btn" disabled={saving} onClick={close}>취소</button>
                        <button type="button" className="mp-btn dark" disabled={saving || noChannel} onClick={async () => {
                          if (await handleSubscribeInterest(interestId, row)) { setSubDialog(null); setSubToast(`${label} 구독을 시작했어요`); }
                        }}>{saving ? "구독 중…" : "구독하기"}</button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })() : null}

      {subToast ? <div className="mp-toast" role="status"><CheckCircle2 size={18} />{subToast}</div> : null}
    </div>
  );
}
