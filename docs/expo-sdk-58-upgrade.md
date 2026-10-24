# Expo SDK 58 호환 수정 — 2026-10-24

iOS Expo Go SDK 58에서 SDK 57 프로젝트의 QR 코드를 열면 SDK 불일치로 앱 로드 전에 차단된다. 프로젝트를 Expo 58.0.19, React Native 0.88.0, React 19.3.0으로 올리고 공식 `expo install --fix`가 지정하는 Expo/네이티브 패키지 및 개발 타입을 정렬했다.

React Native 0.88의 함수형 컴포넌트 타입에 맞춰 ref를 `ComponentRef<typeof Component>`로 변경했다. 테마의 null 색상값을 light로 처리하고, 웹 체크박스 키보드 이벤트는 DOM/native 이벤트 형태를 모두 처리한다. 기존 화면 디자인과 라우트는 변경하지 않았다.

검증:

- Expo Doctor 20/20, typecheck, lint, diff check 통과.
- 단위 테스트 160/160 통과.
- iOS/Android/web 배포 번들 export 및 fixture 비밀/주소 혼입 검사 통과.
- 브라우저 smoke 6/6: 아카이브·로그인/주문·장바구니·게시글/댓글·예약·외부 요청 차단.
- iOS 실기기의 QR 스캔과 화면 실행은 사용자 기기에서 재확인이 필요하다.

사용자 프로젝트에서 실행 중인 Metro를 Ctrl+C로 종료한 뒤:

```sh
npm start -- --clear
```

다른 checkout/새 환경에서는 먼저 `npm ci`를 실행한다. 개발 빌드를 쓰는 기기는 새 SDK로 development build를 다시 만들어야 한다.

근거: [공식 SDK 업그레이드 절차](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/), [SDK 58 변경 사항](https://expo.dev/changelog/sdk-58), [공식 expo-upgrade 스킬](https://github.com/expo/skills/blob/main/plugins/expo/skills/expo-upgrade/SKILL.md).
