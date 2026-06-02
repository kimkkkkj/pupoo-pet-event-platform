// file: src/main/java/com/popups/pupoo/board/bannedword/persistence/BannedWordRepository.java
package com.popups.pupoo.board.bannedword.persistence;

import com.popups.pupoo.board.bannedword.domain.model.BannedWord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BannedWordRepository extends JpaRepository<BannedWord, Long> {

    List<BannedWord> findAllByBoard_BoardIdOrderByBannedWordIdAsc(Long boardId);

    /** 전체 금지어 모두 조회 */
    List<BannedWord> findAllByOrderByBoard_BoardIdAscBannedWordIdAsc();

    /** 해당 게시판 전용 + 전역(board_id NULL) 금지어 모두 조회 */
    List<BannedWord> findByBoard_BoardIdOrBoardIsNullOrderByBannedWordIdAsc(Long boardId);

    Page<BannedWord> findByBoard_BoardIdOrderByBannedWordIdAsc(Long boardId, Pageable pageable);

    /** 해당 게시판 전용 + 전역(board_id NULL) 금지어 페이징 조회 */
    @Query("SELECT b FROM BannedWord b WHERE b.board.boardId = :boardId OR b.board IS NULL ORDER BY b.bannedWordId ASC")
    Page<BannedWord> findByBoardIdOrGlobal(@Param("boardId") Long boardId, Pageable pageable);

    /**
     * 위와 동일 범위에서 금지어 텍스트 부분 일치(대소문자 무시).
     */
    @Query("SELECT b FROM BannedWord b WHERE (b.board.boardId = :boardId OR b.board IS NULL) "
            + "AND LOWER(b.bannedWord) LIKE LOWER(CONCAT('%', :keyword, '%')) ORDER BY b.bannedWordId ASC")
    Page<BannedWord> findByBoardIdOrGlobalAndBannedWordContainingIgnoreCase(
            @Param("boardId") Long boardId,
            @Param("keyword") String keyword,
            Pageable pageable);
}
