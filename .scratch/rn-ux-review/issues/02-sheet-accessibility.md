# 02: 필터·정렬 시트의 읽기와 복귀를 보장하기

**What to build:** 시트를 열고 값을 선택하거나 취소하는 전체 흐름을 VoiceOver/TalkBack 및 키보드에서도 현재 문맥 안에서 완료할 수 있다.

**Blocked by:** None (can start immediately).

**Status:** implemented-awaiting-native-verification

**Priority:** high

**Finding:** H02

**Spec:** S01

- [ ] 기존 네이티브 Modal 기본 동작의 실제 결과를 먼저 기록하고 부족한 계약만 수정한다.
- [ ] 필터·정렬 시트 진입 시 제목·목적이 안내되고 시트가 열린 동안 배경 조작이 읽기 순서를 방해하지 않는다.
- [ ] 닫기 및 Android Back 후 호출한 컨트롤 또는 합리적인 대체 위치로 포커스가 돌아온다.
- [ ] 선택/취소 후 목록의 필터·정렬·스크롤 맥락이 유지된다.
- [ ] 웹 키보드 회귀와 실제 native runtime의 화면낭독기 검증을 구분해 남기며 미실행을 통과 처리하지 않는다.

**Verification boundary:** 기존 사용자 조작→fixture API→표시 결과의 여정을 사용한다. 스키마·API 변경이 필요 없는 티켓에 가상의 백엔드 작업을 추가하지 않는다. 실제 실행한 검증만 완료 증거로 남긴다.

## 구현 진행 — 2026-10-18

기존 Modal을 유지하고 native 제목 포커스·접근성 escape·호출 버튼 복귀 및 키보드 회피를 추가했다. 웹은 Modal 기본 포커스 트랩·Escape·복귀를 E2E로 확인했다. 네이티브 기본 동작 사전 측정과 VoiceOver/TalkBack 비교는 도구 부재로 미실행이며 이 티켓은 종료하지 않는다.

세부 증거와 남은 검증: [구현 기록](../IMPLEMENTATION.md). 수용 기준 체크박스는 실제 네이티브 증거 없이 일괄 완료 처리하지 않는다.
