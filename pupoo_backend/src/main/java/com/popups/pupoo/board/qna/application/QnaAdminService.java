// file: src/main/java/com/popups/pupoo/board/qna/application/QnaAdminService.java
package com.popups.pupoo.board.qna.application;

import com.popups.pupoo.board.boardinfo.domain.enums.BoardType;
import com.popups.pupoo.board.post.domain.enums.PostStatus;
import com.popups.pupoo.board.post.domain.model.Post;
import com.popups.pupoo.board.qna.persistence.QnaRepository;
import com.popups.pupoo.common.exception.BusinessException;
import com.popups.pupoo.common.exception.ErrorCode;
import com.popups.pupoo.notification.application.NotificationService;
import com.popups.pupoo.notification.domain.enums.InboxTargetType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class QnaAdminService {

    private final QnaRepository qnaRepository;
    private final NotificationService notificationService;

    public void writeAnswer(Long qnaId, String answerContent) {
        Post post = qnaRepository.findQnaById(qnaId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "QnA가 존재하지 않습니다."));

        if (post.getBoard() == null || post.getBoard().getBoardType() != BoardType.QNA) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "QnA가 존재하지 않습니다.");
        }

        post.writeAnswer(answerContent);
        qnaRepository.save(post);
    }

    public void clearAnswer(Long qnaId) {
        Post post = qnaRepository.findQnaById(qnaId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "QnA가 존재하지 않습니다."));

        if (post.getBoard() == null || post.getBoard().getBoardType() != BoardType.QNA) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "QnA가 존재하지 않습니다.");
        }

        post.clearAnswer();
        qnaRepository.save(post);
    }

    /**
     * QnA 게시글 공개(PUBLISHED) / 숨김(HIDDEN) 전환.
     */
    public void setPublicationStatus(Long qnaId, PostStatus status) {
        Post post = qnaRepository.findQnaById(qnaId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "QnA가 존재하지 않습니다."));

        if (post.getBoard() == null || post.getBoard().getBoardType() != BoardType.QNA) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "QnA가 존재하지 않습니다.");
        }

        PostStatus previousStatus = post.getStatus();

        if (status == PostStatus.PUBLISHED) {
            post.restore();
        } else if (status == PostStatus.HIDDEN) {
            post.hide();
        } else {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "publicationStatus는 PUBLISHED 또는 HIDDEN만 허용됩니다.");
        }
        Post saved = qnaRepository.save(post);

        if (status == PostStatus.HIDDEN && previousStatus != PostStatus.HIDDEN) {
            notificationService.publishUserNoticeNotification(
                    saved.getUserId(),
                    "질문 숨김 등록 안내",
                    saved.getPostId() + "번 질문 게시글이 숨김글로 등록되었습니다. 관리자 확인후 답변 드리겠습니다. 감사합니다.",
                    InboxTargetType.NOTICE,
                    saved.getPostId()
            );
        }
    }
}
