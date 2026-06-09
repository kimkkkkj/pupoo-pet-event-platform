
반려동물 박람회·페스티벌을 탐색하고 신청·결제까지 하는 행사 플랫폼.
사용자 사이트와 운영자용 관리자 콘솔로 구성. 실시간 혼잡도, 안내 챗봇,
포스터 자동 생성, 혼잡도 예측 등 AI 기능 탑재.

팀 프로젝트, **프론트엔드·UI/UX 단독 담당.**
사용자 사이트·관리자 콘솔 전 화면 설계·구현, 디자인 시스템, 반응형 작업.
추가로 담당 영역의 DB 연동, AI 기능(챗봇·포스터) 프론트 연동,
관리자에서 등록·수정한 공지·행사·갤러리 등 콘텐츠가 사용자 사이트에
실시간 반영되도록 하는 연동까지 진행.

## 기술 스택
- Frontend — React, Vite, React Router
- DB — MySQL 8 (담당 영역 스키마·쿼리)
- AI — 안내 챗봇·포스터 생성 등 AI 기능 프론트 연동. LLM은 provider 교체 가능(AWS Bedrock / Groq·Gemini 등 OpenAI 호환)

## 주요 기능
**사용자** — 행사 탐색·신청, KakaoPay 결제/환불, 프로그램 신청·QR 입장,
커뮤니티(후기·갤러리·Q&A), 실시간 혼잡도·대기 현황, 안내 챗봇 '푸리'.

**관리자** — 행사·참가자·결제 관리, 커뮤니티/신고 모더레이션, 통계 대시보드,
운영 보조 챗봇 '누리', AI 포스터 생성기, 혼잡도 예측 시각화.

## 주요 화면

> 아래 `🖼️` 자리에 스크린샷을 넣어주세요.
> 가장 쉬운 방법 — GitHub에서 이 파일 **편집(✏️)** 후 이미지를 표 칸에 **드래그&드롭** 하면 자동 업로드됩니다.
> (또는 `docs/screenshots/` 폴더에 넣고 `![설명](docs/screenshots/파일명.png)` 로 교체)

### 사용자 사이트
| 홈 | 행사 상세 | 결제 (KakaoPay) |
|:---:|:---:|:---:|
| 🖼️ | <img width="1919" height="912" alt="행사" src="https://github.com/user-attachments/assets/6d7ab382-e63d-49f1-af1e-ee5c1f87d249" />
 | 🖼️ |
| **안내 챗봇 '푸리'** | **커뮤니티(후기·갤러리·Q&A)** | **실시간 혼잡도·대기** |
| <img width="392" height="583" alt="푸리" src="https://github.com/user-attachments/assets/b575fcb6-525c-471d-beeb-aceb5e53ae5a" />| <img width="1905" height="914" alt="게시" src="https://github.com/user-attachments/assets/a26544dc-132e-4e87-a3f4-fc4d08cc1460" /> | <img width="1905" height="923" alt="실시간" src="https://github.com/user-attachments/assets/9d5f17d7-4bce-4ce1-81b3-6182fc88b78d" />
 |

### 관리자 콘솔
| 대시보드 | 행사 관리 | 참가자/결제 관리 |
|:---:|:---:|:---:|
| 🖼️ | 🖼️ | 🖼️ |

| **AI 포스터 생성** | **AI 게시판 검열** | **운영 챗봇 '누리'** |
| 🖼️ | 🖼️ | 🖼️ |

> 💡 챗봇 대화·AI 포스터 생성처럼 **움직임이 있는 기능은 GIF**로 넣으면 임팩트가 큽니다. (Windows: ScreenToGif 등 무료 도구)
