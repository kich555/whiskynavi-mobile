# RN UX 개선 작업 인덱스

기준 커밋: `b0d740939d9c37d6ba20b58a55ebcd08e7bcdc4d` · 2026-10-18

사용자가 지정한 **로컬 Markdown 트래커**다. GitHub 이슈는 생성하지 않았다. 사용자 위임에 따라 테스트 경계·티켓 크기·차단 관계는 추가 인터뷰 없이 결정했다. 스킬의 인터뷰/승인 단계를 수행한 것처럼 기록하지 않는다.

## 문서

- [디자인 리뷰와 high/medium/low 개선 목록](REVIEW.md)
- [S01: 누구나 탐색하고 읽을 수 있는 모바일 기본 조작](specs/01-accessible-navigation-and-reading.md)
- [S02: 탐색·이미지·로그인에서 사용자가 흐름을 제어하기](specs/02-discovery-feedback-and-control.md)
- [S03: 첫 화면 신뢰도와 실제 네이티브 완료 증거](specs/03-startup-consistency-and-native-evidence.md)

## 티켓과 의존성

이 파일들은 최초 명세와 현재 구현 진행을 함께 보관한다. 각 티켓의 Status와 마지막 구현 진행 절을 확인한다. 기기 검증을 끝낸 상태는 아니다. 최초 착수 시 실행 가능 여부는 **Blocked by**로 결정했다. 01~12는 즉시 착수할 수 있으며 high 01~04를 우선한다. 같은 공유 UI를 건드리는 변경은 작업 중 충돌을 조정하되 가짜 의존성을 만들지 않는다. 13은 01~10의 사용자 흐름이 완료된 뒤 전체 네이티브 증거를 확정한다. 11·12의 low 개선은 이 완료 증거를 인위적으로 막지 않는다.

| Ticket                                  | Level  | 전달하는 사용자 행동                             | Blocked by                             |
| --------------------------------------- | ------ | ------------------------------------------------ | -------------------------------------- |
| [01](issues/01-menu-activation.md)      | high   | 메뉴를 선택한 순간에만 닫고 이동하기             | None                                   |
| [02](issues/02-sheet-accessibility.md)  | high   | 필터·정렬 시트의 읽기와 복귀를 보장하기          | None                                   |
| [03](issues/03-touch-targets.md)        | high   | 헤더·칩·배너를 실수 없이 누르기                  | None                                   |
| [04](issues/04-commerce-contrast.md)    | high   | 상품의 상세 버튼과 판매 상태를 또렷하게 읽기     | None                                   |
| [05](issues/05-large-text.md)           | medium | 큰 글자로도 보틀과 상품을 비교하기               | None                                   |
| [06](issues/06-carousel-control.md)     | medium | 홈 배너를 원하는 속도로 읽기                     | None                                   |
| [07](issues/07-startup-fonts.md)        | medium | 첫 실행에서 빈 화면 없이 탐색 시작하기           | None                                   |
| [08](issues/08-home-partial-failure.md) | medium | 홈에서 실패한 콘텐츠만 다시 불러오기             | None                                   |
| [09](issues/09-auth-feedback.md)        | medium | 로그인 입력 오류를 잃지 않고 교정하기            | None                                   |
| [10](issues/10-gallery-controls.md)     | medium | 스와이프 없이도 보틀의 모든 이미지 보기          | None                                   |
| [11](issues/11-navigation-feedback.md)  | low    | 현재 위치와 누름 상태를 알아보기                 | None                                   |
| [12](issues/12-archive-consistency.md)  | low    | 보틀 목록과 상세의 시각 기준을 일관되게 유지하기 | None                                   |
| [13](issues/13-native-verification.md)  | medium | 개선된 흐름을 실제 네이티브 환경에서 검증하기    | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10 |

## 범위

사용자가 시안을 승인한 뒤 RN 디자인 코드 개선을 반영했다. [구현 기록](IMPLEMENTATION.md)에 변경·검증·남은 환경 제약을 기록한다. 07의 리소스 성능 측정·최적화와 13의 실제 네이티브 증거는 미완료다. 원본 웹 브랜드와 네이티브 탭/시트/페이지 구조를 유지한다. 네이티브 도구·기기·원격 Git 연결의 준비를 완료한 것으로 가정하지 않는다.

## 구현 검증

웹 E2E 35개·단위/계약 102개 통과. 01~06·08~12는 구현 반영 후 네이티브 검증 대기, 07은 부분 구현, 13은 실행 환경 미준비다. 최초 스펙의 사용자 행동과 수용 기준을 삭제하거나 완료 증거로 바꾸지 않는다.

## 공통 UI 후속 개선

[Glassmorphism 컨트롤 구현과 검증](GLASS-CONTROLS.md): 버튼·체크박스·입력·칩·시트와 동의 UI를 통일했다. 후속 최종 웹 E2E는 37개이며 기기 검증 제약은 유지한다.
