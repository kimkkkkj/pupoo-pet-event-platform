package com.popups.pupoo.report.api;

import com.popups.pupoo.board.boardinfo.domain.enums.BoardType;
import com.popups.pupoo.board.post.domain.model.Post;
import com.popups.pupoo.board.post.persistence.PostRepository;
import com.popups.pupoo.board.review.domain.model.Review;
import com.popups.pupoo.board.review.persistence.ReviewRepository;
import com.popups.pupoo.common.api.ApiResponse;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.gallery.domain.model.Gallery;
import com.popups.pupoo.gallery.persistence.GalleryRepository;
import com.popups.pupoo.reply.domain.model.PostComment;
import com.popups.pupoo.reply.domain.model.ReviewComment;
import com.popups.pupoo.reply.persistence.PostCommentRepository;
import com.popups.pupoo.reply.persistence.ReviewCommentRepository;
import com.popups.pupoo.report.application.AdminReportService;
import com.popups.pupoo.report.domain.enums.ReportStatus;
import com.popups.pupoo.report.domain.enums.ReportTargetType;
import com.popups.pupoo.report.domain.model.ContentReport;
import com.popups.pupoo.report.dto.AdminReportDecisionRequest;
import com.popups.pupoo.report.dto.AdminReportDetailResponse;
import com.popups.pupoo.report.dto.ReportResponse;
import com.popups.pupoo.report.persistence.ContentReportRepository;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/reports")
public class AdminReportController {

    private static final String SORT_LATEST = "LATEST";
    private static final String SORT_REPORT_COUNT = "REPORT_COUNT";

    private final ContentReportRepository reportRepository;
    private final AdminReportService adminReportService;
    private final PostRepository postRepository;
    private final GalleryRepository galleryRepository;
    private final ReviewRepository reviewRepository;
    private final PostCommentRepository postCommentRepository;
    private final ReviewCommentRepository reviewCommentRepository;

    public AdminReportController(ContentReportRepository reportRepository,
                                 AdminReportService adminReportService,
                                 PostRepository postRepository,
                                 GalleryRepository galleryRepository,
                                 ReviewRepository reviewRepository,
                                 PostCommentRepository postCommentRepository,
                                 ReviewCommentRepository reviewCommentRepository) {
        this.reportRepository = reportRepository;
        this.adminReportService = adminReportService;
        this.postRepository = postRepository;
        this.galleryRepository = galleryRepository;
        this.reviewRepository = reviewRepository;
        this.postCommentRepository = postCommentRepository;
        this.reviewCommentRepository = reviewCommentRepository;
    }

    @GetMapping
    public ApiResponse<Page<ReportResponse>> list(@RequestParam(required = false) ReportStatus status,
                                                  @RequestParam(required = false) ReportTargetType targetType,
                                                  @RequestParam(required = false) Long reporterUserId,
                                                  @RequestParam(defaultValue = SORT_LATEST) String sortBy,
                                                  Pageable pageable) {
        String normalizedSort = normalizeSort(sortBy);
        int pageNumber = Math.max(pageable.getPageNumber(), 0);
        int pageSize = pageable.getPageSize() > 0 ? pageable.getPageSize() : 20;

        Page<ContentReport> page = SORT_REPORT_COUNT.equals(normalizedSort)
                ? reportRepository.searchOrderByTotalReportCount(status, targetType, reporterUserId, PageRequest.of(pageNumber, pageSize))
                : reportRepository.search(
                        status,
                        targetType,
                        reporterUserId,
                        PageRequest.of(pageNumber, pageSize, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("reportId")))
                );

        Map<String, long[]> counts = loadCounts(page.getContent());
        Map<String, TargetSnapshot> targets = loadTargetSnapshots(page.getContent());

        List<ReportResponse> items = new ArrayList<>();
        for (ContentReport report : page.getContent()) {
            String reportKey = key(report.getTargetType(), report.getTargetId());
            long[] count = counts.getOrDefault(reportKey, new long[]{0L, 0L});
            TargetSnapshot target = targets.getOrDefault(reportKey, TargetSnapshot.missing());
            items.add(ReportResponse.from(report, count[0], count[1], target.title(), target.path(), target.status()));
        }

        return ApiResponse.success(new PageImpl<>(items, PageRequest.of(pageNumber, pageSize), page.getTotalElements()));
    }

    @GetMapping("/{reportId}")
    public ApiResponse<AdminReportDetailResponse> detail(@PathVariable Long reportId) {
        ContentReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        String reportKey = key(report.getTargetType(), report.getTargetId());
        TargetSnapshot target = loadTargetSnapshots(List.of(report)).getOrDefault(reportKey, TargetSnapshot.missing());
        long[] counts = loadCounts(List.of(report)).getOrDefault(reportKey, new long[]{0L, 0L});

        return ApiResponse.success(
                AdminReportDetailResponse.from(
                        report,
                        target.title(),
                        target.path(),
                        target.status(),
                        counts[0],
                        counts[1]
                )
        );
    }

    @PatchMapping("/{reportId}")
    public ApiResponse<ReportResponse> decide(@PathVariable Long reportId,
                                              @Valid @RequestBody AdminReportDecisionRequest req) {
        String decision = req.getDecision().trim().toUpperCase();
        if ("ACCEPT".equals(decision) || "ACCEPTED".equals(decision)) {
            return ApiResponse.success(adminReportService.accept(reportId, req.getReason()));
        }
        if ("REJECT".equals(decision) || "REJECTED".equals(decision)) {
            return ApiResponse.success(adminReportService.reject(reportId, req.getReason()));
        }
        throw new IllegalArgumentException("decision must be ACCEPT/REJECT");
    }

    private String normalizeSort(String sortBy) {
        if (sortBy == null || sortBy.isBlank()) {
            return SORT_LATEST;
        }
        String normalized = sortBy.trim().toUpperCase();
        if (SORT_LATEST.equals(normalized)) {
            return SORT_LATEST;
        }
        if (SORT_REPORT_COUNT.equals(normalized) || "COUNT".equals(normalized)) {
            return SORT_REPORT_COUNT;
        }
        throw new BusinessException(ErrorCode.VALIDATION_FAILED, "invalid sortBy: " + sortBy);
    }

    private Map<String, long[]> loadCounts(List<ContentReport> reports) {
        Map<String, long[]> map = new HashMap<>();
        if (reports == null || reports.isEmpty()) {
            return map;
        }

        Map<ReportTargetType, List<Long>> byType = new EnumMap<>(ReportTargetType.class);
        for (ContentReport report : reports) {
            if (report.getTargetType() == null || report.getTargetId() == null) {
                continue;
            }
            byType.computeIfAbsent(report.getTargetType(), ignored -> new ArrayList<>()).add(report.getTargetId());
        }

        for (Map.Entry<ReportTargetType, List<Long>> entry : byType.entrySet()) {
            List<Long> ids = entry.getValue().stream().filter(Objects::nonNull).distinct().toList();
            if (ids.isEmpty()) {
                continue;
            }
            for (ContentReportRepository.TargetCountRow row : reportRepository.countGroupedByTargetId(entry.getKey(), ids)) {
                map.put(key(entry.getKey(), row.getTargetId()), new long[]{row.getTotalCount(), row.getPendingCount()});
            }
        }

        return map;
    }

    private Map<String, TargetSnapshot> loadTargetSnapshots(List<ContentReport> reports) {
        Map<String, TargetSnapshot> map = new HashMap<>();
        if (reports == null || reports.isEmpty()) {
            return map;
        }

        Map<ReportTargetType, List<Long>> byType = new EnumMap<>(ReportTargetType.class);
        for (ContentReport report : reports) {
            if (report.getTargetType() == null || report.getTargetId() == null) {
                continue;
            }
            byType.computeIfAbsent(report.getTargetType(), ignored -> new ArrayList<>()).add(report.getTargetId());
        }

        hydratePosts(map, distinctIds(byType.get(ReportTargetType.POST)));
        hydrateReviews(map, distinctIds(byType.get(ReportTargetType.REVIEW)));
        hydrateGalleries(map, distinctIds(byType.get(ReportTargetType.GALLERY)));
        hydratePostComments(map, distinctIds(byType.get(ReportTargetType.POST_COMMENT)));
        hydrateReviewComments(map, distinctIds(byType.get(ReportTargetType.REVIEW_COMMENT)));

        return map;
    }

    private void hydratePosts(Map<String, TargetSnapshot> map, List<Long> postIds) {
        Map<Long, Post> posts = loadPostMap(postIds);
        for (Long postId : postIds) {
            Post post = posts.get(postId);
            if (post == null) {
                map.put(key(ReportTargetType.POST, postId), TargetSnapshot.missing());
                continue;
            }
            String status = post.isDeleted() ? "DELETED" : post.getStatus().name();
            map.put(
                    key(ReportTargetType.POST, postId),
                    new TargetSnapshot(post.getPostTitle(), buildPostPath(post), status)
            );
        }
    }

    private void hydrateReviews(Map<String, TargetSnapshot> map, List<Long> reviewIds) {
        Map<Long, Review> reviews = reviewRepository.findAllById(reviewIds).stream()
                .collect(Collectors.toMap(Review::getReviewId, review -> review));

        for (Long reviewId : reviewIds) {
            Review review = reviews.get(reviewId);
            if (review == null) {
                map.put(key(ReportTargetType.REVIEW, reviewId), TargetSnapshot.missing());
                continue;
            }
            map.put(
                    key(ReportTargetType.REVIEW, reviewId),
                    new TargetSnapshot(review.getReviewTitle(), buildReviewPath(review.getReviewId()), review.getReviewStatus().name())
            );
        }
    }

    private void hydrateGalleries(Map<String, TargetSnapshot> map, List<Long> galleryIds) {
        Map<Long, Gallery> galleries = galleryRepository.findAllById(galleryIds).stream()
                .collect(Collectors.toMap(Gallery::getGalleryId, gallery -> gallery));

        for (Long galleryId : galleryIds) {
            Gallery gallery = galleries.get(galleryId);
            if (gallery == null) {
                map.put(key(ReportTargetType.GALLERY, galleryId), TargetSnapshot.missing());
                continue;
            }
            map.put(
                    key(ReportTargetType.GALLERY, galleryId),
                    new TargetSnapshot(gallery.getGalleryTitle(), buildGalleryPath(gallery), gallery.getGalleryStatus().name())
            );
        }
    }

    private void hydratePostComments(Map<String, TargetSnapshot> map, List<Long> commentIds) {
        Map<Long, PostComment> comments = postCommentRepository.findAllById(commentIds).stream()
                .collect(Collectors.toMap(PostComment::getCommentId, comment -> comment));
        Map<Long, Post> parentPosts = loadPostMap(
                comments.values().stream()
                        .map(PostComment::getPostId)
                        .filter(Objects::nonNull)
                        .distinct()
                        .toList()
        );

        for (Long commentId : commentIds) {
            PostComment comment = comments.get(commentId);
            if (comment == null) {
                map.put(key(ReportTargetType.POST_COMMENT, commentId), TargetSnapshot.missing());
                continue;
            }

            Post parent = parentPosts.get(comment.getPostId());
            String parentPath = parent == null ? null : buildPostPath(parent);
            String path = parentPath == null ? null : parentPath + "#reply-" + comment.getCommentId();
            String status = comment.isDeleted() ? "DELETED" : "ACTIVE";

            map.put(
                    key(ReportTargetType.POST_COMMENT, commentId),
                    new TargetSnapshot(abbreviate(comment.getContent()), path, status)
            );
        }
    }

    private void hydrateReviewComments(Map<String, TargetSnapshot> map, List<Long> commentIds) {
        Map<Long, ReviewComment> comments = reviewCommentRepository.findAllById(commentIds).stream()
                .collect(Collectors.toMap(ReviewComment::getCommentId, comment -> comment));

        for (Long commentId : commentIds) {
            ReviewComment comment = comments.get(commentId);
            if (comment == null) {
                map.put(key(ReportTargetType.REVIEW_COMMENT, commentId), TargetSnapshot.missing());
                continue;
            }

            String path = buildReviewPath(comment.getReviewId()) + "#reply-" + comment.getCommentId();
            String status = comment.isDeleted() ? "DELETED" : "ACTIVE";

            map.put(
                    key(ReportTargetType.REVIEW_COMMENT, commentId),
                    new TargetSnapshot(abbreviate(comment.getContent()), path, status)
            );
        }
    }

    private Map<Long, Post> loadPostMap(Collection<Long> postIds) {
        if (postIds == null || postIds.isEmpty()) {
            return Map.of();
        }
        return postRepository.findAllWithBoardByPostIdIn(postIds.stream().toList()).stream()
                .collect(Collectors.toMap(Post::getPostId, post -> post));
    }

    private List<Long> distinctIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return ids.stream().filter(Objects::nonNull).distinct().toList();
    }

    private String buildPostPath(Post post) {
        if (post == null || post.getPostId() == null || post.getBoard() == null || post.getBoard().getBoardType() == null) {
            return null;
        }

        BoardType boardType = post.getBoard().getBoardType();
        if (boardType == BoardType.FREE) {
            return "/community/freeboard/" + post.getPostId();
        }
        if (boardType == BoardType.INFO) {
            return "/community/info/" + post.getPostId();
        }
        if (boardType == BoardType.QNA) {
            return "/community/qna/" + post.getPostId();
        }
        if (boardType == BoardType.FAQ) {
            return "/community/faq/" + post.getPostId();
        }
        return null;
    }

    private String buildReviewPath(Long reviewId) {
        if (reviewId == null) {
            return null;
        }
        return "/community/review/" + reviewId;
    }

    private String buildGalleryPath(Gallery gallery) {
        if (gallery == null || gallery.getGalleryId() == null) {
            return null;
        }

        StringBuilder path = new StringBuilder("/gallery/eventgallery?");
        if (gallery.getEventId() != null) {
            path.append("eventId=").append(gallery.getEventId()).append("&");
        }
        path.append("galleryId=").append(gallery.getGalleryId());
        return path.toString();
    }

    private String abbreviate(String raw) {
        if (raw == null) {
            return null;
        }
        String normalized = raw.replaceAll("\\s+", " ").trim();
        if (normalized.isEmpty()) {
            return null;
        }
        return normalized.length() > 72 ? normalized.substring(0, 69) + "..." : normalized;
    }

    private String key(ReportTargetType type, Long id) {
        return type.name() + ":" + id;
    }

    private record TargetSnapshot(String title, String path, String status) {
        private static TargetSnapshot missing() {
            return new TargetSnapshot(null, null, "DELETED");
        }
    }
}
