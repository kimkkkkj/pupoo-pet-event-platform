import CommunityBoardWritePage from "./CommunityBoardWritePage";

export default function FreeBoardWritePage() {
  return (
    <CommunityBoardWritePage
      pageTitle="자유게시판"
      pageSubtitle="자유롭게 의견을 나누는 커뮤니티 공간입니다."
      currentPath="/community/freeboard"
      badgeType="FREEBOARD"
      boardType="FREE"
    />
  );
}
