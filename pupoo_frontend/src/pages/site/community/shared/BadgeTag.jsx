import {
  Megaphone, MessageCircle, Star, HelpCircle, BookOpen, Lightbulb, Globe, PartyPopper,
} from "lucide-react";

const ICON_MAP = {
  Megaphone,
  MessageCircle,
  Star,
  HelpCircle,
  BookOpen,
  Lightbulb,
  Globe,
  PartyPopper,
};

/**
 * 뱃지 태그 — getBoardBadge() 또는 getNoticeScopeBadge() 결과를 렌더링
 *
 * 사용법:
 *   <BadgeTag badge={getBoardBadge("NOTICE")} />
 *   <BadgeTag icon="Globe" label="전체" style={{ ... }} />
 */
export default function BadgeTag({ badge, icon, label, style }) {
  const iconName = icon || badge?.icon;
  const text = label || badge?.text;
  const badgeStyle = style || badge?.style || {};
  const Icon = iconName ? ICON_MAP[iconName] : null;

  return (
    <span style={badgeStyle}>
      {Icon && <Icon size={13} strokeWidth={2.2} />}
      {text}
    </span>
  );
}
