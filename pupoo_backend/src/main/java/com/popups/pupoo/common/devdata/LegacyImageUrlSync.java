package com.popups.pupoo.common.devdata;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 로컬 DB의 옛 이미지 경로(/uploads/...)를 seed 기준 S3 주소로 맞춘다.
 *
 * 예전에 만든 로컬 DB에는 존재하지 않는 /uploads 경로가 남아 포스터·사진이 깨진다.
 * 앱이 켜질 때 한 번, seed의 옛 파일 이름이 그대로 남은 행만 바꾸므로 이미 올바른 값이나 새로 올린 이미지는 건드리지 않는다.
 * 운영 환경에서는 app.legacy-image-sync.enabled=false 로 끈다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.legacy-image-sync.enabled", havingValue = "true")
public class LegacyImageUrlSync implements ApplicationRunner {

    private record Row(Long id, String url) {}

    private static final List<Row> EVENTS = List.of(
            new Row(1L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/seoul-pet-pestival.png"),
            new Row(2L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/busan-pet-fair.png"),
            new Row(3L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/korea-pet-expo.png"),
            new Row(4L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/daegu-pet-fair.png"),
            new Row(8L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/jeju-pet-fair.png"),
            new Row(9L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/korea-pet-fair.png"),
            new Row(10L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/pet-lifestayle-fair.png"),
            new Row(13L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/ulsan-pet-fair.png")
    );
    private static final List<Row> PROGRAMS = List.of(
            new Row(1L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/booth-walk-safety.png"),
            new Row(159L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/booth-dog-photo.png"),
            new Row(268L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/booth-cat-agility.png"),
            new Row(559L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/booth-first-aid.png"),
            new Row(1193L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/booth-healing-massage.png"),
            new Row(1241L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/booth-talent-contest.png"),
            new Row(1293L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/booth-training-basics.png"),
            new Row(1456L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/booth-puzzle-game.png")
    );
    private static final List<Row> SPEAKERS = List.of(
            new Row(1L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/seoyoon.png"),
            new Row(4L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/chaewon.png"),
            new Row(7L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/seonghyun.png")
    );
    private static final List<Row> GALLERY_IMAGES = List.of(
            new Row(1L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/booth-cat-agility.png"),
            new Row(2L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/booth-dog-photo.png"),
            new Row(7L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/booth-first-aid.png"),
            new Row(11L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/booth-healing-massage.png"),
            new Row(13L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/booth-puzzle-game.png"),
            new Row(17L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/booth-talent-contest.png"),
            new Row(1785L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/booth-training-basics.png"),
            new Row(1814L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/booth-walk-safety.png"),
            new Row(1815L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/kongi.png"),
            new Row(1816L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/gureum.png"),
            new Row(1817L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/hero.png")
    );
    private static final List<Row> PETS = List.of(
            new Row(629L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/hero.png"),
            new Row(630L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/gureum.png"),
            new Row(7010L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/kongi.png"),
            new Row(9362L, "https://pupoo-uploads-kgj.s3.ap-northeast-2.amazonaws.com/image/chu.png")
    );

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        int total = 0;
        try {
            // seed가 만든 옛 파일 이름(event_1.jpg 등)이 그대로 남은 행만 바꾼다. 관리자가 새로 올린 이미지는 그대로 둔다.
            total += sync("UPDATE event SET image_url = ? WHERE event_id = ? AND image_url LIKE ?", EVENTS, "%%/event_%d.jpg");
            total += sync("UPDATE event_program SET image_url = ? WHERE program_id = ? AND image_url LIKE ?", PROGRAMS, "%%/program_%d.jpg");
            total += sync("UPDATE speakers SET speaker_image_url = ? WHERE speaker_id = ? AND speaker_image_url LIKE ?", SPEAKERS, "%%/speaker_%d.jpg");
            // 반려동물 사진은 컬럼이 나중에 생겨 비어 있는 경우만 채운다.
            for (Row row : PETS) {
                total += jdbcTemplate.update("UPDATE pet SET image_url = ? WHERE pet_id = ? AND image_url IS NULL", row.url(), row.id());
            }
            for (Row row : GALLERY_IMAGES) {
                total += jdbcTemplate.update(
                        "UPDATE gallery_images SET original_url = ?, thumb_url = ? WHERE image_id = ? AND original_url LIKE '%/gallery/gallery\\_%'",
                        row.url(), row.url(), row.id());
            }
        } catch (RuntimeException e) {
            // 이미지 경로 보정은 부가 기능이라 실패해도 앱 시작을 막지 않는다.
            log.warn("[LegacyImageUrlSync] 이미지 경로 보정 중 오류: {}", e.getMessage());
            return;
        }
        if (total > 0) {
            log.info("[LegacyImageUrlSync] 옛 이미지 경로 {}건을 S3 주소로 바꿨습니다.", total);
        }
    }

    private int sync(String sql, List<Row> rows, String legacyPattern) {
        int updated = 0;
        for (Row row : rows) {
            updated += jdbcTemplate.update(sql, row.url(), row.id(), String.format(legacyPattern, row.id()));
        }
        return updated;
    }
}
