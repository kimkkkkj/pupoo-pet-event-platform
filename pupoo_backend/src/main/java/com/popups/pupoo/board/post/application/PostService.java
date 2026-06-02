// file: src/main/java/com/popups/pupoo/board/post/application/PostService.java
package com.popups.pupoo.board.post.application;

import com.popups.pupoo.board.bannedword.application.BannedWordService;
import com.popups.pupoo.board.bannedword.application.ContentModerationService;
import com.popups.pupoo.board.bannedword.application.ModerationBlockMessageResolver;
import com.popups.pupoo.board.bannedword.application.ModerationResult;
import com.popups.pupoo.board.bannedword.domain.enums.BannedLogContentType;
import com.popups.pupoo.board.boardinfo.domain.enums.BoardType;
import com.popups.pupoo.board.boardinfo.domain.model.Board;
import com.popups.pupoo.board.boardinfo.persistence.BoardRepository;
import com.popups.pupoo.board.post.domain.enums.PostStatus;
import com.popups.pupoo.board.post.domain.model.Post;
import com.popups.pupoo.board.post.dto.PostCreateRequest;
import com.popups.pupoo.board.post.dto.PostModerationResponse;
import com.popups.pupoo.board.post.dto.PostResponse;
import com.popups.pupoo.board.post.dto.PostUpdateRequest;
import com.popups.pupoo.board.post.persistence.PostRepository;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.common.search.SearchType;
import com.popups.pupoo.reply.persistence.PostCommentRepository;
import com.popups.pupoo.user.persistence.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class PostService {

    private final PostRepository postRepository;
    private final PostCommentRepository postCommentRepository;
    private final BoardRepository boardRepository;
    private final BannedWordService bannedWordService;
    private final ContentModerationService contentModerationService;
    private final UserRepository userRepository;
    private final ModerationBlockMessageResolver moderationBlockMessageResolver;

    private Long resolveBoardId(Long boardId, BoardType boardType) {
        if (boardId != null) return boardId;
        if (boardType == null) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "boardId or boardType is required");
        }
        return boardRepository.findByBoardType(boardType)
                .map(Board::getBoardId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Board not found for boardType: " + boardType));
    }

    public Page<PostResponse> getPosts(Long boardId, String keyword, PostStatus status, Pageable pageable) {
        if (boardId == null) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "boardId is required");
        }
        Page<Post> page = postRepository.search(boardId, keyword, status, pageable);
        List<PostResponse> content = page.getContent().stream().map(this::toResponse).toList();
        return new PageImpl<>(content, page.getPageable(), page.getTotalElements());
    }

    public Page<PostResponse> getPublicPosts(Long boardId, String keyword, Pageable pageable) {
        return getPublicPosts(boardId, (BoardType) null, SearchType.TITLE_CONTENT, keyword, pageable, null);
    }

    public Page<PostResponse> getPublicPosts(Long boardId, BoardType boardType, String keyword, Pageable pageable) {
        return getPublicPosts(boardId, boardType, SearchType.TITLE_CONTENT, keyword, pageable, null);
    }

    public Page<PostResponse> getPublicPosts(Long boardId, SearchType searchType, String keyword, Pageable pageable) {
        return getPublicPosts(boardId, null, searchType, keyword, pageable, null);
    }

    public Page<PostResponse> getPublicPosts(Long boardId, BoardType boardType, SearchType searchType, String keyword, Pageable pageable) {
        return getPublicPosts(boardId, boardType, searchType, keyword, pageable, null);
    }

    public Page<PostResponse> getPublicPosts(Long boardId,
                                             BoardType boardType,
                                             SearchType searchType,
                                             String keyword,
                                             Pageable pageable,
                                             String sortKey) {
        Long resolvedBoardId = resolveBoardId(boardId, boardType);
        SearchType effectiveType = (searchType != null) ? searchType : SearchType.TITLE_CONTENT;

        Page<Post> page;
        String normalizedSortKey = sortKey == null ? "" : sortKey.trim().toLowerCase();
        boolean sortByComments = "comments".equals(normalizedSortKey)
                || "comment".equals(normalizedSortKey)
                || "commentcount".equals(normalizedSortKey);
        // 프론트는 sortKey(recent/views)만 보내고 Spring sort 파라미터를 쓰지 않음 → 명시적 ORDER BY 없으면 PK/미정 순서로 보일 수 있음
        Pageable pageableForQuery = sortByComments ? pageable : applyPublicPostSort(pageable, normalizedSortKey);

        if (sortByComments) {
            String publishedStatus = PostStatus.PUBLISHED.name();
            page = switch (effectiveType) {
                case TITLE -> postRepository.searchByTitleSortedByCommentCount(resolvedBoardId, keyword, publishedStatus, pageableForQuery);
                case CONTENT -> postRepository.searchByContentSortedByCommentCount(resolvedBoardId, keyword, publishedStatus, pageableForQuery);
                case WRITER -> {
                    Long writerId = parseLongOrNull(keyword);
                    if (writerId == null) yield Page.empty(pageableForQuery);
                    yield postRepository.searchByWriterSortedByCommentCount(resolvedBoardId, writerId, publishedStatus, pageableForQuery);
                }
                default -> postRepository.searchByTitleContentSortedByCommentCount(resolvedBoardId, keyword, publishedStatus, pageableForQuery);
            };
        } else {
            page = switch (effectiveType) {
                case TITLE -> postRepository.searchByTitle(resolvedBoardId, keyword, PostStatus.PUBLISHED, pageableForQuery);
                case CONTENT -> postRepository.searchByContent(resolvedBoardId, keyword, PostStatus.PUBLISHED, pageableForQuery);
                case WRITER -> {
                    Long writerId = parseLongOrNull(keyword);
                    yield postRepository.searchByWriter(resolvedBoardId, writerId, PostStatus.PUBLISHED, pageableForQuery);
                }
                default -> postRepository.search(resolvedBoardId, keyword, PostStatus.PUBLISHED, pageableForQuery);
            };
        }

        List<Post> posts = page.getContent();
        Map<Long, Long> commentCountMap = fetchCommentCounts(posts);
        List<PostResponse> content = posts.stream()
                .map(p -> toResponse(p, commentCountMap.getOrDefault(p.getPostId(), 0L)))
                .toList();
        return new PageImpl<>(content, page.getPageable(), page.getTotalElements());
    }

    private static Long parseLongOrNull(String keyword) {
        if (keyword == null || keyword.isBlank()) return null;
        try {
            return Long.parseLong(keyword.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** sortKey(recent/views)만 오는 공개 목록용: JPQL에 ORDER BY가 없으므로 Pageable Sort로 등록일·조회수 기준을 고정한다. */
    private static Pageable applyPublicPostSort(Pageable pageable, String normalizedSortKey) {
        Sort sort;
        if ("views".equals(normalizedSortKey)
                || "view".equals(normalizedSortKey)
                || "viewcount".equals(normalizedSortKey)) {
            sort = Sort.by(Sort.Order.desc("viewCount"), Sort.Order.desc("postId"));
        } else {
            // recent, 빈 값, 그 외 → 등록일 최신순
            sort = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("postId"));
        }
        if (pageable.isUnpaged()) {
            return PageRequest.of(0, Integer.MAX_VALUE, sort);
        }
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);
    }

    @Transactional
    public PostResponse getPublicPost(Long postId) {
        if (postId == null) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "postId is required");
        }

        postRepository.increaseViewCount(postId);

        Post post = postRepository.findByPostIdAndDeletedFalse(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Post not found"));

        if (post.getStatus() != PostStatus.PUBLISHED) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Post not found");
        }
        return toResponse(post);
    }

    @Transactional
    public PostResponse getPost(Long postId) {
        if (postId == null) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "postId is required");
        }

        postRepository.increaseViewCount(postId);

        Post post = postRepository.findByPostIdAndDeletedFalse(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Post not found"));

        return toResponse(post);
    }

    private String getWriterEmail(Long userId) {
        return userId != null ? userRepository.findById(userId).map(u -> u.getEmail()).orElse(null) : null;
    }

    private String getWriterNickname(Long userId) {
        return userId != null ? userRepository.findById(userId).map(u -> u.getNickname()).orElse(null) : null;
    }

    private PostResponse toResponse(Post post) {
        return toResponse(post, null, null);
    }

    private PostResponse toResponse(Post post, Long commentCount) {
        return toResponse(post, commentCount, null);
    }

    private PostResponse toResponse(Post post, Long commentCount, ModerationResult moderationResult) {
        return PostResponse.from(
                post,
                getWriterEmail(post.getUserId()),
                getWriterNickname(post.getUserId()),
                post.getPostTitle(),
                post.getContent(),
                commentCount,
                PostModerationResponse.from(moderationResult)
        );
    }

    private Map<Long, Long> fetchCommentCounts(List<Post> posts) {
        if (posts == null || posts.isEmpty()) return Map.of();
        List<Long> postIds = posts.stream().map(Post::getPostId).toList();
        List<Object[]> rows = postCommentRepository.countByPostIds(postIds);
        Map<Long, Long> map = new HashMap<>();
        for (Object[] row : rows) {
            if (row == null || row.length < 2) continue;
            Long postId = row[0] != null ? ((Number) row[0]).longValue() : null;
            Long cnt = row[1] != null ? ((Number) row[1]).longValue() : 0L;
            if (postId != null) map.put(postId, cnt);
        }
        return map;
    }

    @Transactional
    public PostResponse createPost(Long userId, PostCreateRequest req) {
        if (req == null) {
            log.warn("createPost called with null req (userId={})", userId);
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "request is required");
        }
        String title = req.getPostTitle();
        String content = req.getContent();
        int titleLen = title == null ? 0 : title.length();
        int contentLen = content == null ? 0 : content.length();
        String titlePreview = title == null ? "null" : (title.length() <= 40 ? title : title.substring(0, 40) + "...");
        String contentPreview = content == null ? "null" : (content.length() <= 40 ? content : content.substring(0, 40) + "...");
        log.warn("createPost request: userId={}, boardId={}, postTitleLen={}, contentLen={}, titlePreview='{}', contentPreview='{}'",
                userId, req.getBoardId(), titleLen, contentLen, titlePreview, contentPreview);

        if (userId == null) throw new BusinessException(ErrorCode.UNAUTHORIZED);

        if (req.getBoardId() == null || req.getPostTitle() == null || req.getPostTitle().isBlank() || req.getContent() == null) {
            log.warn("createPost validation failed: userId={}, boardId={}, postTitle={}, contentNull={}",
                    userId, req.getBoardId(), req.getPostTitle(), req.getContent() == null);
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "boardId/postTitle/content is required");
        }

        Board board = boardRepository.findById(req.getBoardId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Board not found"));

        ModerationResult modResult = null;
        if (!bannedWordService.shouldSkipModeration(userId)) {
            String textToModerate = (req.getPostTitle() != null ? req.getPostTitle() : "") + " " + (req.getContent() != null ? req.getContent() : "");
            log.warn("Calling AI moderation for post: textLen={}, preview='{}'",
                    textToModerate.length(), textToModerate.length() <= 60 ? textToModerate : textToModerate.substring(0, 60) + "...");
            modResult = contentModerationService.moderatePost(board, req.getPostTitle(), req.getContent());
            if (modResult != null && modResult.isBlock()) {
                log.warn("Final moderation decision: operation=create, boardId={}, boardType={}, decision={}, result=fail",
                        board.getBoardId(), board.getBoardType(), modResult.getAction());
                bannedWordService.logAiModeration(
                        req.getBoardId(),
                        null,
                        BannedLogContentType.POST,
                        userId,
                        modResult
                );
                String msg = moderationBlockMessageResolver.resolveCreateBlockMessage("\uAC8C\uC2DC\uAE00", modResult);
                throw new BusinessException(ErrorCode.VALIDATION_FAILED, msg);
            }
        }

        Post post = Post.builder()
                .board(board)
                .userId(userId)
                .postTitle(req.getPostTitle())
                .content(req.getContent())
                .fileAttached("N")
                .status(PostStatus.PUBLISHED)
                .viewCount(0)
                .deleted(false)
                .commentEnabled(true)
                .build();

        Post saved = postRepository.save(post);
        log.info("Final moderation decision: operation=create, boardId={}, boardType={}, decision={}, result=success, moderationIncluded={}",
                board.getBoardId(),
                board.getBoardType(),
                modResult != null ? modResult.getAction() : "SKIP",
                PostModerationResponse.from(modResult) != null);
        return toResponse(saved, null, modResult);
    }

    @Transactional
    public PostResponse updatePost(Long userId, Long postId, PostUpdateRequest req) {
        if (userId == null) throw new BusinessException(ErrorCode.UNAUTHORIZED);

        Post post = postRepository.findByPostIdAndUserIdAndDeletedFalse(postId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.FORBIDDEN, "No permission to update"));

        return applyPostUpdateWithModeration(post, req, userId);
    }

    @Transactional
    public void adminUpdatePost(Long adminUserId, Long postId, PostUpdateRequest req) {
        if (adminUserId == null) throw new BusinessException(ErrorCode.UNAUTHORIZED);

        Post post = postRepository.findByPostIdAndDeletedFalse(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Post not found"));

        if (req.getPostTitle() == null || req.getPostTitle().isBlank() || req.getContent() == null) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "postTitle/content is required");
        }
        post.updateTitleAndContent(req.getPostTitle(), req.getContent());
    }

    private PostResponse applyPostUpdateWithModeration(Post post, PostUpdateRequest req, Long userIdForModeration) {
        if (req.getPostTitle() == null || req.getPostTitle().isBlank() || req.getContent() == null) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "postTitle/content is required");
        }

        ModerationResult modResult = null;
        if (!bannedWordService.shouldSkipModeration(userIdForModeration)) {
            modResult = contentModerationService.moderatePost(post.getBoard(), req.getPostTitle(), req.getContent());
            if (modResult != null && modResult.isBlock()) {
                log.warn("Final moderation decision: operation=update, boardId={}, boardType={}, postId={}, decision={}, result=fail",
                        post.getBoard().getBoardId(), post.getBoard().getBoardType(), post.getPostId(), modResult.getAction());
                bannedWordService.logAiModeration(
                        post.getBoard().getBoardId(),
                        post.getPostId(),
                        BannedLogContentType.POST,
                        userIdForModeration,
                        modResult
                );
                throw new BusinessException(
                        ErrorCode.VALIDATION_FAILED,
                        moderationBlockMessageResolver.resolveUpdateBlockMessage("\uAC8C\uC2DC\uAE00", modResult)
                );
            }
        }
        post.updateTitleAndContent(req.getPostTitle(), req.getContent());
        log.info("Final moderation decision: operation=update, boardId={}, boardType={}, postId={}, decision={}, result=success, moderationIncluded={}",
                post.getBoard().getBoardId(),
                post.getBoard().getBoardType(),
                post.getPostId(),
                modResult != null ? modResult.getAction() : "SKIP",
                PostModerationResponse.from(modResult) != null);
        return toResponse(post, null, modResult);
    }

    @Transactional
    public void deletePost(Long userId, Long postId) {
        if (userId == null) throw new BusinessException(ErrorCode.UNAUTHORIZED);

        Post post = postRepository.findByPostIdAndUserIdAndDeletedFalse(postId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.FORBIDDEN, "No permission to delete"));

        post.markDeleted();
    }

    @Transactional
    public void closePost(Long userId, Long postId) {
        if (userId == null) throw new BusinessException(ErrorCode.UNAUTHORIZED);

        Post post = postRepository.findByPostIdAndUserIdAndDeletedFalse(postId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.FORBIDDEN, "No permission"));

        post.close();
    }

    @Transactional
    public void adminDelete(Long postId) {
        Post post = postRepository.findByPostIdAndDeletedFalse(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Post not found"));
        post.markDeleted();
    }
}
