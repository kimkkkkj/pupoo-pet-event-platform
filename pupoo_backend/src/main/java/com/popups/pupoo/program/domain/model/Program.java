// file: src/main/java/com/popups/pupoo/program/domain/model/Program.java
package com.popups.pupoo.program.domain.model;

import com.popups.pupoo.program.domain.enums.ProgramCategory;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "event_program")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Program {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "program_id")
	private Long programId;

	@Column(name = "event_id", nullable = false)
	private Long eventId;

	@Enumerated(EnumType.STRING)
	@Column(name = "category", nullable = false, columnDefinition = "ENUM('CONTEST','SESSION','EXPERIENCE')")
	private ProgramCategory category;

	@Column(name = "program_title", nullable = false, length = 255)
	private String programTitle;

	@Column(name = "description", nullable = false, length = 1000)
	private String description;

	@Column(name = "start_at", nullable = false)
	private LocalDateTime startAt;

	@Column(name = "end_at", nullable = false)
	private LocalDateTime endAt;

	/**
	 *  v2.7 변경 포인트 - event_program.place_name 컬럼 없음 - event_program.booth_id 컬럼
	 * 존재(Nullable)
	 */
	@Column(name = "booth_id")
	private Long boothId;

	@Column(name = "capacity")
	private Integer capacity;

	@Column(name = "throughput_per_min")
	private BigDecimal throughputPerMin;

	// TODO(step-01-storage-policy): keep the legacy column name for now, but store a storage key instead of a full URL.
	@Column(name = "image_url")
	private String imageUrl;

	@Column(name = "created_at", updatable = false)
	private LocalDateTime createdAt;

	/*
	 * ========================= 업데이트 메서드 =========================
	 */

	public void updateCategory(ProgramCategory category) {
		this.category = category;
	}

	public void updateProgramTitle(String programTitle) {
		this.programTitle = programTitle;
	}

	public void updateDescription(String description) {
		this.description = description;
	}

	public void updateStartAt(LocalDateTime startAt) {
		this.startAt = startAt;
	}

	public void updateEndAt(LocalDateTime endAt) {
		this.endAt = endAt;
	}

	public void updateBoothId(Long boothId) {
		this.boothId = boothId;
	}

	public void updateCapacity(Integer capacity) {
		this.capacity = capacity;
	}

	public void updateThroughputPerMin(BigDecimal throughputPerMin) {
		this.throughputPerMin = throughputPerMin;
	}

	/** ★ 추가: 이미지 URL 수정 */
	public void updateImageUrl(String imageUrl) {
		this.imageUrl = imageUrl;
	}

	/*
	 * ========================= 상태 계산 로직 =========================
	 */

	public boolean isOngoing() {
		LocalDateTime now = LocalDateTime.now();
		return (now.isEqual(startAt) || now.isAfter(startAt)) && now.isBefore(endAt);
	}

	public boolean isUpcoming() {
		return LocalDateTime.now().isBefore(startAt);
	}

	public boolean isEnded() {
		return LocalDateTime.now().isAfter(endAt);
	}

	// 프로그램 신청 관련
	// CONTEST: 행사 종료 전까지 언제든 신청 가능 (투표 시작 이후도 허용)
	// 그 외: 기존대로 startAt - 1시간 이전까지만 허용
	public boolean isApplyAllowed() {
		if (this.category == ProgramCategory.CONTEST) {
			// 콘테스트는 endAt 이전이면 신청 허용
			return !LocalDateTime.now().isAfter(this.endAt);
		}
		LocalDateTime cutoff = this.startAt.minusHours(1);
		return !LocalDateTime.now().isAfter(cutoff); // now <= cutoff
	}
}
