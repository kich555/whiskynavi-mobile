# WhiskyNavi Mobile

기존 WhiskyNavi 사용자 웹 화면을 React Native로 옮긴 Expo 앱입니다. Expo SDK 58, React 19, TypeScript, Expo Router를 사용합니다.

## 바로 실행

```sh
cd ~/Documents/dev/navi/whiskynavi-mobile
npm ci
npm start
```

Expo Go 최신 버전(SDK 58)과 프로젝트의 SDK 버전이 일치해야 합니다. SDK를 변경한 뒤에는 기존 Metro를 종료하고 `npm start -- --clear`로 다시 시작하세요. iPhone 실기기는 구버전 Expo Go를 설치할 수 없으므로 버전 불일치 시 프로젝트 의존성을 업데이트해야 합니다.

휴대폰에 Expo Go를 설치하고 컴퓨터와 같은 Wi-Fi에서 QR 코드를 스캔하세요. iPhone은 카메라, Android는 Expo Go에서 스캔합니다. 브라우저 미리보기는 `npm run web`입니다.

Xcode가 설치된 Mac의 iOS 시뮬레이터는 `npm run ios`, Android SDK와 실행 중인 에뮬레이터가 있으면 `npm run android`를 사용할 수 있습니다. Expo Go 외부 앱 복귀와 결제 검증에는 별도 네이티브 빌드가 필요할 수 있습니다.

공개 설정은 [.env.example](.env.example)을 참고하세요. 기본 API는 `https://api.whiskynavi.com`입니다. 비밀번호·토큰·서버 비밀을 EXPO_PUBLIC 환경변수에 넣지 않습니다. 원래 웹 프로젝트의 .env는 복사하지 않았습니다.

## Expo Go와 EAS 프로젝트 연결

현재 EAS 프로젝트는 [@whiskynavi/whiskynavi](https://expo.dev/accounts/whiskynavi/projects/whiskynavi)이며 프로젝트 ID는 `5a3fcce4-fd47-4b15-ab7a-8f03783c711f`입니다. `app.config.ts`가 최종 설정을 결정하므로 EAS의 프로젝트 slug와 같은 `whiskynavi`를 사용합니다. Git 저장소·폴더 이름은 `whiskynavi-mobile`을 유지합니다.

```sh
npm start -- --go
```

휴대폰과 Mac을 같은 Wi-Fi에 연결하고 Expo Go로 터미널의 QR을 스캔하세요. Expo Go 로컬 실행에는 EAS 클라우드 빌드나 스토어 서명이 필요하지 않습니다. 연결 확인은 `npx eas-cli@25.2.0 project:info`로 할 수 있습니다. 이 프로젝트의 SDK는 57입니다.

동적 설정을 사용하는 프로젝트에서 EAS가 slug를 자동 수정하지 못하면 `app.config.ts`와 `app.json`의 slug가 EAS 프로젝트와 일치하는지 확인하세요. `app.json`의 `extra.eas.projectId`와 `owner`도 최종 공개 설정에 유지돼야 합니다.

## 설치·시작 오류가 발생할 때

실행 중인 개발 서버를 `Ctrl+C`로 종료한 뒤 이 프로젝트 폴더에서 `npm ci`를 완료하고 `npm start`를 실행하세요. 이미 다른 창에서 같은 앱이 실행 중이면 Expo가 다른 포트를 사용할지 안내합니다.

`expo: command not found`는 의존성 설치가 끝나지 않아 실행 파일이 없는 상태일 수 있습니다. 설치 오류를 먼저 해결하고 `npm ci`를 다시 완료하세요.

Metro 변환 캐시는 OS의 임시 폴더에 프로젝트 경로와 production/E2E 실행 모드별로 구분해 저장합니다. `node_modules` 안에 캐시를 두지 않으므로 의존성 재설치의 삭제 작업과 캐시 쓰기가 같은 디렉토리에서 충돌하지 않습니다. 공개 API 주소가 바뀌면 캐시 버전도 분리합니다.

## 화면 구성

- 하단 탭: 홈 / 아카이브 / 예약 / 쇼핑 / 마이.
- 아카이브 상세·상품·글·주문·예약 상세는 독립 화면입니다.
- 필터·상품 옵션·관리자 게시글 관리·개인정보 전문은 하단 시트로 표시합니다.
- 키보드가 필요한 긴 폼은 별도 화면으로 구성합니다.
- 사용자 화면은 RN 요소로 구현했습니다. NICE·토스·카드사 제공 화면에만 전용 WebView를 사용합니다.

원본 `(main)` 53개 페이지와 `nice` 1개 페이지를 53개 URL로 정리했습니다. 중복된 아카이브 모달 URL은 상세 화면으로 합쳤으며 쇼핑 탭 진입용 `/shop`을 추가했습니다. [전체 대응표](route-migration.json)와 [마이그레이션 상태](MIGRATION.md)를 참고하세요.

## React 개발자를 위한 안내

컴포넌트, JSX, props, useState, useEffect, Context는 익숙한 방식으로 사용합니다.

| 웹 React      | React Native                   |
| ------------- | ------------------------------ |
| div           | View                           |
| p, span       | Text                           |
| onClick       | Pressable의 onPress            |
| input         | TextInput                      |
| CSS           | StyleSheet.create, style 객체  |
| 스크롤 페이지 | ScrollView, 긴 목록은 FlatList |

숫자 크기는 논리 픽셀이고 Flex 기본 방향은 세로입니다. 텍스트는 Text 안에 넣습니다. Next.js Server Component·Server Action 대신 모바일 API 호출과 Query 캐시를 사용합니다.

| 위치                      | 역할                                |
| ------------------------- | ----------------------------------- |
| src/app/(main)/(tabs)     | 하단 탭 진입점                      |
| src/app/(main)            | 상세·입력·결과 화면의 URL 연결      |
| src/features              | 실제 화면과 도메인별 동작           |
| src/components/native     | 버튼·폼·시트·목록·본문 렌더링       |
| src/apis/generated/api.ts | 웹과 동일한 자동 생성 API 계약      |
| src/apis/mutator.ts       | 모바일 네트워크·인증 갱신·오류 처리 |
| src/lib/session.ts        | 로그인 상태, SecureStore 저장       |
| app.config.ts             | 앱 식별자와 운영/E2E 빌드 구분      |

처음 수정할 화면은 `src/features/archive/screens.tsx`의 HomeScreen입니다. 글자나 간격을 바꾸고 휴대폰에 반영되는지 확인하며 시작하세요.

## 검사와 E2E

```sh
npm run lint
npm run typecheck
npm test
npm run build:bundles
npm run test:e2e:validate
npm run test:e2e:doctor -- android
npx playwright install chromium
npm run test:e2e:web
npm run test:e2e:android
```

[테스트 안내](e2e/README.md)에 로컬 도구, iOS 실행, fixture 서버, Maestro 시나리오와 GitHub Actions 구성을 정리했습니다. 웹 E2E와 네이티브 E2E는 서로 다른 검증입니다. 현재 E2E는 로컬 fixture만 허용하고 외부 요청을 전송 전에 차단합니다. 초기 검증에서 발생한 운영 요청과 미정리 항목은 [마이그레이션 상태](MIGRATION.md)에 기록했습니다.

GitHub Actions workflow는 저장되어 있으며 원격 GitHub에서 실행한 상태는 아닙니다. 배포용 서명키·스토어 제출은 별도 작업입니다.

## API 계약 동기화

웹에서 `pnpm gen:api`로 재생성한 뒤 이 프로젝트에서 `npm run api:sync`를 실행합니다. 다른 경로라면 `npm run api:sync -- /절대/경로/웹프로젝트`를 사용하세요. 자동 생성 파일을 직접 수정하지 말고 모바일 어댑터를 수정합니다.

## 공식 문서

- [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/)
- [React Native 기본 요소](https://reactnative.dev/docs/intro-react-native-components)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Maestro 설치](https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli)

## 웹 디자인과 비교하기

웹 서버가 3100에서 실행 중일 때 `npm run web:compare`로 RN 비교 서버를 8082에서 실행합니다. 웹과 같은 공개 API 주소를 자동으로 사용합니다. `npm run design:compare`는 390×844 화면의 비교 보고서를 `artifacts/design-sync/index.html`에 만듭니다. 기준과 의도적인 네이티브 차이는 [DESIGN.md](DESIGN.md)에 있습니다.
