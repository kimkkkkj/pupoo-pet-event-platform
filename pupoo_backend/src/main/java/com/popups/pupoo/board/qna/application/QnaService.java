// file: src/main/java/com/popups/pupoo/board/qna/application/QnaService.java
package com.popups.pupoo.board.qna.application;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.popups.pupoo.auth.security.util.SecurityUtil;
import com.popups.pupoo.board.bannedword.application.BannedWordService;
import com.popups.pupoo.board.bannedword.application.ModerationClient;
import com.popups.pupoo.board.bannedword.application.ModerationResult;
import com.popups.pupoo.board.bannedword.domain.enums.BannedLogContentType;
import com.popups.pupoo.board.boardinfo.domain.enums.BoardType;
import com.popups.pupoo.board.boardinfo.domain.model.Board;
import com.popups.pupoo.board.boardinfo.persistence.BoardRepository;
import com.popups.pupoo.board.post.domain.enums.PostStatus;
import com.popups.pupoo.board.post.domain.model.Post;
import com.popups.pupoo.board.post.persistence.PostRepository;
import com.popups.pupoo.board.qna.domain.enums.QnaStatus;
import com.popups.pupoo.board.qna.dto.QnaCreateRequest;
import com.popups.pupoo.board.qna.dto.QnaResponse;
import com.popups.pupoo.board.qna.dto.QnaUpdateRequest;
import com.popups.pupoo.board.qna.persistence.QnaRepository;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.notification.application.NotificationService;
import com.popups.pupoo.notification.domain.enums.InboxTargetType;
import com.popups.pupoo.user.persistence.UserRepository;

import lombok.RequiredArgsConstructor;

/**
 * 사용자 QnA 게시글 생성과 공개 조회를 담당한다.
 * 답변 여부는 answeredAt 존재 여부를 기준으로 WAITING/ANSWERED로 계산한다.
 * <p>
 * AI 모더레이션 BLOCK 시 QnA는 {@link PostStatus#HIDDEN}으로 저장되며, 목록에서는 마스킹된다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QnaService {

    private static final List<PostStatus> QNA_PUBLIC_LIST_STATUSES = List.of(PostStatus.PUBLISHED, PostStatus.HIDDEN);

    private final QnaRepository qnaRepository;
    private final BoardRepository boardRepository;
    private final BannedWordService bannedWordService;
    private final ModerationClient moderationClient;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final SecurityUtil securityUtil;
    private final NotificationService notificationService;

    /**
     * QnA 작성. AI 모더레이션 BLOCK이면 DB에 HIDDEN으로 저장하고 로그에 contentId를 남긴다(예외 없음).
     */
    @Transactional
    public QnaResponse create(Long userId, QnaCreateRequest request) {
        if (!userRepository.existsById(userId)) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND, "사용자를 찾을 수 없습니다. 다시 로그인해 주세요.");
        }

        Board qnaBoard = boardRepository.findByBoardType(BoardType.QNA)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "QNA 게시판(board_type=QNA)이 존재하지 않습니다."));

        ModerationResult modResult = null;
        if (!bannedWordService.shouldSkipModeration(userId)) {
            String textToModerate = (request.getTitle() != null ? request.getTitle() : "") + " " + (request.getContent() != null ? request.getContent() : "");
            modResult = moderationClient.moderate(textToModerate.trim(), qnaBoard.getBoardId(), "POST");
            if (modResult != null && modResult.isBlock()) {
                Post hidden = Post.builder()
                        .board(qnaBoard)
                        .userId(userId)
                        .postTitle(request.getTitle())
                        .content(request.getContent())
                        .fileAttached("N")
                        .status(PostStatus.HIDDEN)
                        .viewCount(0)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .deleted(false)
                        .commentEnabled(false)
                        .build();
                Post saved = qnaRepository.save(hidden);
                bannedWordService.logAiModeration(
                        qnaBoard.getBoardId(),
                        saved.getPostId(),
                        BannedLogContentType.POST,
                        userId,
                        modResult
                );
                notificationService.publishUserNoticeNotification(
                        userId,
                        "질문 숨김 등록 안내",
                        saved.getPostId() + "번 질문 게시글이 숨김글로 등록되었습니다. 관리자 확인후 답변 드리겠습니다. 감사합니다.",
                        InboxTargetType.NOTICE,
                        saved.getPostId()
                );
                return buildQnaResponse(saved, saved.getViewCount(), false, true);
            }
        }

        Post post = Post.builder()
                .board(qnaBoard)
                .userId(userId)
                .postTitle(request.getTitle())
                .content(request.getContent())
                .fileAttached("N")
                .status(PostStatus.PUBLISHED)
                .viewCount(0)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .deleted(false)
                .commentEnabled(false)
                .build();

        Post saved = qnaRepository.save(post);
        return buildQnaResponse(saved, saved.getViewCount(), false, false);
    }

    /**
     * 상세: 공개(PUBLISHED)는 누구나, 숨김(HIDDEN)은 작성자·관리자만 본문 조회 가능.
     */
    @Transactional
    public QnaResponse get(Long qnaId) {
        Post post = qnaRepository.findQnaById(qnaId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "QnA가 존재하지 않습니다."));
        if (post.isDeleted()) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "QnA가 존재하지 않습니다.");
        }

        Long viewerId = securityUtil.currentUserIdOrNull();
        boolean admin = securityUtil.isAdmin();

        if (post.getStatus() == PostStatus.PUBLISHED) {
            postRepository.increaseViewCount(post.getPostId());
            int viewCountAfter = postRepository.getViewCountByPostId(post.getPostId());
            return buildQnaResponse(post, viewCountAfter, false, false);
        }
        if (post.getStatus() == PostStatus.HIDDEN) {
            boolean canView = admin || (viewerId != null && viewerId.equals(post.getUserId()));
            if (!canView) {
                throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "QnA가 존재하지 않습니다.");
            }
            postRepository.increaseViewCount(post.getPostId());
            int viewCountAfter = postRepository.getViewCountByPostId(post.getPostId());
            return buildQnaResponse(post, viewCountAfter, false, false);
        }
        throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "QnA가 존재하지 않습니다.");
    }

    public Page<QnaResponse> list(int page, int size) {
        return list(page, size, null);
    }

    /**
     * WAITING/ANSWERED 필터는 answeredAt 존재 여부 기준.
     * HIDDEN 행은 관리자가 아니면 목록에서 마스킹.
     */
    public Page<QnaResponse> list(int page, int size, String statusFilter) {
        return list(page, size, statusFilter, null, "recent");
    }

    public Page<QnaResponse> list(int page, int size, String statusFilter, String keyword, String sortKey) {
        validatePageRequest(page, size);
        Boolean answeredOnly = null;
        if (statusFilter != null && !statusFilter.isBlank()) {
            if ("ANSWERED".equalsIgnoreCase(statusFilter)) {
                answeredOnly = true;
            } else if ("WAITING".equalsIgnoreCase(statusFilter)) {
                answeredOnly = false;
            }
        }
        Long viewerId = securityUtil.currentUserIdOrNull();
        boolean viewerIsAdmin = securityUtil.isAdmin();
        String kw = (keyword == null || keyword.isBlank()) ? null : keyword.trim();
        String sk = (sortKey == null || sortKey.isBlank()) ? "recent" : sortKey.trim().toLowerCase();
        PageRequest pageable = PageRequest.of(page, size);
        // 답변완료/대기중 필터에서는 숨김글(HIDDEN)을 목록에서 제외한다.
        List<PostStatus> statusesForList = answeredOnly == null
                ? QNA_PUBLIC_LIST_STATUSES
                : List.of(PostStatus.PUBLISHED);

        Page<Post> result = switch (sk) {
            case "oldest" -> qnaRepository.searchAllQnaVisibleOldest(statusesForList, answeredOnly, kw, pageable);
            case "views" -> qnaRepository.searchAllQnaVisibleViews(statusesForList, answeredOnly, kw, pageable);
            default -> qnaRepository.searchAllQnaVisibleRecent(statusesForList, answeredOnly, kw, pageable);
        };
        return result.map(p -> toListItemResponse(p, viewerIsAdmin, viewerId));
    }

    /**
     * 수정: 공개·숨김(HIDDEN) 질문. BLOCK 시 내용 반영 후 HIDDEN 유지 및 로그(예외 없음).
     * 모더레이션 통과 시 HIDDEN이었다면 공개(PUBLISHED)로 복구한다.
     */
    @Transactional
    public QnaResponse update(Long userId, Long qnaId, QnaUpdateRequest request) {
        Post post = qnaRepository.findQnaById(qnaId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "QnA가 존재하지 않습니다."));
        if (post.isDeleted()) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "QnA가 존재하지 않습니다.");
        }
        if (post.getStatus() != PostStatus.PUBLISHED && post.getStatus() != PostStatus.HIDDEN) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "QnA가 존재하지 않습니다.");
        }

        if (!post.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "수정 권한이 없습니다.");
        }

        Long qnaBoardId = boardRepository.findByBoardType(BoardType.QNA)
                .map(Board::getBoardId).orElse(null);

        if (!bannedWordService.shouldSkipModeration(userId) && qnaBoardId != null) {
            String textToModerate = (request.getTitle() != null ? request.getTitle() : "") + " "
                    + (request.getContent() != null ? request.getContent() : "");
            ModerationResult modResult = moderationClient.moderate(textToModerate.trim(), qnaBoardId, "POST");
            if (modResult != null && modResult.isBlock()) {
                post.updateTitleAndContent(request.getTitle(), request.getContent());
                post.hide();
                Post saved = qnaRepository.save(post);
                bannedWordService.logAiModeration(
                        qnaBoardId, qnaId, BannedLogContentType.POST, userId, modResult);
                return buildQnaResponse(saved, saved.getViewCount(), false, true);
            }
        }

        post.updateTitleAndContent(request.getTitle(), request.getContent());
        if (post.getStatus() == PostStatus.HIDDEN) {
            post.restore();
        }

        Post saved = qnaRepository.save(post);
        return buildQnaResponse(saved, saved.getViewCount(), false, false);
    }

    /**
     * 삭제: 작성자 본인의 미삭제 QnA(공개·숨김) 처리.
     */
    @Transactional
    public void delete(Long userId, Long qnaId) {
        Post post = qnaRepository.findQnaById(qnaId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "QnA가 존재하지 않습니다."));
        if (post.isDeleted()) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "QnA가 존재하지 않습니다.");
        }
        if (!post.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "삭제 권한이 없습니다.");
        }
        post.hide();
        post.markDeleted();
        qnaRepository.save(post);
    }

    /**
     * 마감: 공개 질문만 HIDDEN 처리.
     */
    @Transactional
    public void close(Long userId, Long qnaId) {
        Post post = qnaRepository.findQnaPublishedById(qnaId, PostStatus.PUBLISHED)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "QnA가 존재하지 않습니다."));

        if (!post.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "마감 권한이 없습니다.");
        }

        post.close();
        qnaRepository.save(post);
    }

    private void validatePageRequest(int page, int size) {
        if (page < 0) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "page는 0 이상이어야 합니다.");
        }
        if (size < 1 || size > 100) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "size는 1~100 범위여야 합니다.");
        }
    }

    private QnaResponse toListItemResponse(Post post, boolean viewerIsAdmin, Long viewerId) {
        boolean isOwner = viewerId != null && viewerId.equals(post.getUserId());
        boolean masked = post.getStatus() == PostStatus.HIDDEN && !viewerIsAdmin && !isOwner;
        return buildQnaResponse(post, post.getViewCount(), masked, false);
    }

    /**
     * @param maskContent HIDDEN이면 제목·본문·답변 마스킹(관리자 목록은 비마스킹)
     * @param moderationHidden AI 차단으로 숨김 저장된 경우(작성자 응답 안내)
     */
    private QnaResponse buildQnaResponse(Post post, int viewCount, boolean maskContent, boolean moderationHidden) {
        String writerEmail = null;
        String writerNickname = null;
        if (post.getUserId() != null) {
            var u = userRepository.findById(post.getUserId());
            writerEmail = u.map(user -> user.getEmail()).orElse(null);
            writerNickname = u.map(user -> user.getNickname()).orElse(null);
        }

        String title = maskContent ? "관리자 확인후 답변 예정입니다" : post.getPostTitle();
        String content = maskContent ? "" : post.getContent();
        String answerContent = maskContent ? null : post.getAnswerContent();
        LocalDateTime answeredAt = maskContent ? null : post.getAnsweredAt();

        QnaStatus qnaStatus = post.getAnsweredAt() == null ? QnaStatus.WAITING : QnaStatus.ANSWERED;

        return QnaResponse.builder()
                .qnaId(post.getPostId())
                .boardId(post.getBoard().getBoardId())
                .userId(post.getUserId())
                .writerEmail(writerEmail)
                .writerNickname(writerNickname)
                .title(title)
                .content(content)
                .status(qnaStatus)
                .answerContent(answerContent)
                .answeredAt(answeredAt)
                .publicationStatus(post.getStatus().name())
                .masked(maskContent)
                .moderationHidden(moderationHidden)
                .viewCount(viewCount)
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .build();
    }
}
