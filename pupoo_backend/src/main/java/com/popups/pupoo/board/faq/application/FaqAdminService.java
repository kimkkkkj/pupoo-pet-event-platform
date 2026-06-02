// file: src/main/java/com/popups/pupoo/board/faq/application/FaqAdminService.java
package com.popups.pupoo.board.faq.application;

import com.popups.pupoo.board.boardinfo.domain.enums.BoardType;
import com.popups.pupoo.board.boardinfo.domain.model.Board;
import com.popups.pupoo.board.boardinfo.persistence.BoardRepository;
import com.popups.pupoo.board.faq.dto.FaqCreateRequest;
import com.popups.pupoo.board.faq.dto.FaqUpdateRequest;
import com.popups.pupoo.board.post.domain.enums.PostStatus;
import com.popups.pupoo.board.post.domain.model.Post;
import com.popups.pupoo.board.post.persistence.PostRepository;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional
public class FaqAdminService {

    private final BoardRepository boardRepository;
    private final PostRepository postRepository;

    public Long create(Long adminId, FaqCreateRequest req) {
        Board faqBoard = boardRepository.findByBoardType(BoardType.FAQ)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "FAQ_BOARD_NOT_FOUND"));

        if (!faqBoard.isActive()) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "FAQ_BOARD_INACTIVE");
        }

        Post post = Post.builder()
                .board(faqBoard)
                .userId(adminId)
                .postTitle(req.getTitle())
                .content(req.getContent())
                .commentEnabled(false) // FAQ는 기본적으로 댓글 비활성
                .fileAttached("N")
                .status(PostStatus.PUBLISHED)
                .viewCount(0)
                .deleted(false)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        post.writeAnswer(req.getAnswerContent());

        return postRepository.save(post).getPostId();
    }

    public void update(Long postId, FaqUpdateRequest req) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "FAQ_NOT_FOUND"));

        if (post.getBoard() == null || post.getBoard().getBoardType() != BoardType.FAQ) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "FAQ_NOT_FOUND");
        }

        post.updateTitleAndContent(req.getTitle(), req.getContent());
        post.writeAnswer(req.getAnswerContent());
    }

    public void delete(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "FAQ_NOT_FOUND"));

        if (post.getBoard() == null || post.getBoard().getBoardType() != BoardType.FAQ) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "FAQ_NOT_FOUND");
        }

        post.hide();

        post.softDelete();
    }
}