package com.popups.pupoo.board.bannedword.application;

import com.popups.pupoo.board.bannedword.domain.enums.BannedLogContentType;
import com.popups.pupoo.board.bannedword.domain.model.BoardBannedLog;
import com.popups.pupoo.board.bannedword.dto.BoardBannedLogResponse;
import com.popups.pupoo.board.bannedword.persistence.BoardBannedLogRepository;
import com.popups.pupoo.board.post.domain.enums.PostStatus;
import com.popups.pupoo.board.post.domain.model.Post;
import com.popups.pupoo.board.post.persistence.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BoardBannedLogAdminService {

    private final BoardBannedLogRepository boardBannedLogRepository;
    private final PostRepository postRepository;

    public Page<BoardBannedLogResponse> list(Long boardId, Pageable pageable) {
        Page<BoardBannedLog> page = boardId != null
                ? boardBannedLogRepository.findAllByBoardIdOrderByLogIdDesc(boardId, pageable)
                : boardBannedLogRepository.findAllByOrderByLogIdDesc(pageable);
        Map<Long, PostStatus> postStatusById = loadPostStatuses(page.getContent());
        return page.map(log -> {
            Long contentId = log.getContentId();
            PostStatus postStatus = contentId == null ? null : postStatusById.get(contentId);
            return BoardBannedLogResponse.from(log, postStatus);
        });
    }

    private Map<Long, PostStatus> loadPostStatuses(List<BoardBannedLog> logs) {
        Set<Long> postIds = new HashSet<>();
        for (BoardBannedLog log : logs) {
            if (log.getContentType() == BannedLogContentType.POST && log.getContentId() != null) {
                postIds.add(log.getContentId());
            }
        }
        if (postIds.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<Long, PostStatus> out = new HashMap<>();
        for (Post p : postRepository.findAllById(postIds)) {
            out.put(p.getPostId(), p.getStatus());
        }
        return out;
    }
}
