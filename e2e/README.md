# Mobile tests

최신 실행 명령·격리·캐시·실행 리포트·정확한 커버리지 경계는 [E2E 인프라](../docs/e2e-infrastructure.md)를 따른다. 아래 날짜별 수치는 과거 검증 기록이다.

## 구성

- `npm test`: 인증 갱신, 결제 콜백 대조, 예약 기간, 주문 정책, 마이그레이션 URL 계약 검사.
- `npm run test:e2e:web`: Playwright로 모바일 폭의 웹 미리보기를 검증합니다. 화면→API→상태 반영을 검사하며 네이티브 E2E의 대체가 아닙니다.
- `npm run test:e2e:android`: Android release APK 생성·설치 후 Maestro를 실행합니다.
- `npm run test:e2e:ios`: iOS 시뮬레이터의 Release 앱에서 동일한 Maestro 흐름을 실행합니다.

테스트 API는 `http://127.0.0.1:8787`의 독립된 메모리 fixture입니다. 운영·QA 계정, 이메일 발송, 실제 결제, NICE 본인확인 완료를 사용하지 않습니다. fixture 통과는 실제 백엔드나 외부 결제 검증을 의미하지 않습니다.

## 빠른 로컬 검증

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run test:e2e:validate
npx playwright install chromium
npm run test:e2e:web
```

## Android 네이티브 E2E

필요한 도구: Node 24, JDK 17, Android Studio/SDK, Android API 35의 실행 중인 에뮬레이터 (기본 CI 기준), PATH의 adb, Maestro CLI.

```sh
npm run test:e2e:android
```

러너는 E2E 전용 앱 `com.whiskynavi.mobile.e2e`를 만들며 운영 앱과 구분합니다. release 빌드에 JS를 포함하므로 Metro를 띄울 필요가 없습니다. `adb reverse`로 에뮬레이터에서 fixture 서버에 연결합니다. HTTP는 E2E 앱에서만 허용합니다. 첫 빌드는 Android 의존성 다운로드 때문에 오래 걸릴 수 있습니다. 생성되는 android/는 커밋하지 않습니다.

8787 포트는 테스트 전용이다. 기존 Metro는 종료할 필요가 없다. 실기기에서는 합성 fixture만 사용하고 `adb reverse` 연결을 확인하세요. 러너는 앱 데이터를 초기화합니다.

## iOS 네이티브 E2E

전체 Xcode, 시뮬레이터, CocoaPods와 Maestro가 설치된 Mac에서 실행합니다. Command Line Tools만으로는 실행할 수 없습니다.

```sh
npm run test:e2e:ios
```

Maestro는 실제 앱의 네이티브 요소를 조작합니다. iOS 키체인은 앱 데이터 초기화와 별개입니다. E2E 전용 빌드는 cold start마다 테스트 로그인 정보를 지우므로 개인 시뮬레이터의 키체인 전체를 초기화하지 않습니다. 운영 빌드에서는 이 테스트 동작이 제외됩니다.

## 테스트 시나리오

| 구간      | 검증                                                              |
| --------- | ----------------------------------------------------------------- |
| 아카이브  | 목록 → 독립 상세 → 테이스팅 노트, 검색 빈 결과, API 오류와 재시도 |
| 인증      | 보호 화면, 정상 로그인, 잘못된 로그인, 토큰 갱신·403·서버 장애    |
| 장바구니  | 상품 → 담기 → 수량 변경과 서버 견적 → 주문서, 입력 전 결제 차단   |
| 게시판    | 네이티브 입력 → 글 등록 → 상세 → 댓글 등록                        |
| 문의      | 문의 생성 → 추가 메시지 → 대화 표시                               |
| 콜백      | 외부·위조 NICE·결제 결과 거부, 주문번호·금액·origin 검증          |
| 화면 구성 | 상품·이용권·스마트오더·브랜드·소개·약관 라우트                    |

`07-design-controls.yaml`은 메뉴 선택·필터 닫기·비밀번호 표시 전환을 추가로 검사합니다.

`e2e/maestro`의 11개 top-level flow가 네이티브 smoke입니다. 보조 flow는 helpers/에 있으며 독립 실행하지 않습니다. `test:e2e:validate`는 YAML 구문·문서 형태 검사일 뿐 Maestro 실행을 의미하지 않습니다.

## CI

`.github/workflows/mobile-ci.yml`은 Git 저장소에 연결된 뒤 PR/main push에서 실행됩니다.

- quality: 설치, 린트, TypeScript, 단위·계약, Expo Doctor, 웹 번들, Playwright.
- android-e2e: Linux KVM의 API35 에뮬레이터, E2E release APK 빌드, Maestro. 수동 workflow_dispatch의 android_api 입력으로 API36도 선택할 수 있다.

서명키·Expo 계정·운영 비밀 없이 실행하는 합성 회귀 파이프라인입니다. 배포용 AAB/IPA 서명·스토어 제출은 별도 단계입니다. iOS는 로컬 러너를 제공하며 Mac CI 비용을 피하도록 기본 CI에서는 실행하지 않습니다. main push/PR에서 자동 실행되며, 원격 job의 성공 여부는 해당 Actions 실행 결과로 별도 확인해야 합니다.

실패 결과는 `artifacts/`에 보관하고 Git에서는 제외합니다. CI 업로드 대상은 합성 테스트 결과뿐입니다. 실제 사용자 정보로 이 테스트를 실행하거나 trace/스크린샷을 공유하지 마세요.

## 별도 실서비스 QA가 필요한 범위

NICE 통신사·인증 앱 복귀, 토스·카드사 앱 전환/승인, 실제 API의 사업자 권한·멤버십, 업로드, 실기기 키보드/뒤로가기, 앱 재시작 중 결제 복구는 제공자 sandbox·전용 계정·기기에서 별도로 확인해야 합니다.

필요 도구를 한 번에 확인하려면 `npm run test:e2e:doctor -- android` 또는 `npm run test:e2e:doctor -- ios`를 실행하세요.

운영 빌드에는 fixture 계정·주소가 포함되지 않는지 `build:web`/`build:bundles` 마지막 단계에서 자동 검사합니다. E2E 후 일반 네이티브 앱을 실행하려면 `npx expo prebuild --platform android` 또는 `--platform ios`로 일반 앱 설정을 다시 생성하세요.

공식 문서: [Maestro 설치](https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli), [Expo 로컬 빌드](https://docs.expo.dev/guides/local-app-production/).

이전 검증에서 발생한 캐시 혼선·운영 요청과 미정리 장바구니는 [마이그레이션 상태](../MIGRATION.md#테스트-격리와-운영-요청)에 기록했습니다. 현재 러너는 외부 origin을 전송 전에 차단합니다.

## 디자인 비교와 화면 회귀

웹을 3100 포트에서 실행한 뒤 `npm run web:compare`를 실행하면 RN이 웹과 같은 공개 API 주소로 8082 포트에 열린다. `npm run design:compare`는 두 서버의 모바일 화면과 비교 HTML을 `artifacts/design-sync`에 저장한다. 이 명령은 조회 전용이며 로그인·주문·저장을 실행하지 않는다. RN 웹 미리보기이므로 실제 기기의 텍스트·탭·키보드·제스처 검증을 대신하지 않는다.

`npm run test:e2e:web`에는 아카이브·로그인·소개 스크린샷 비교와 320px·430px 필터 시트 검사가 포함된다. 스크린샷은 `e2e/web/__screenshots__`의 공통 기준을 사용하며 작은 글꼴 렌더링 차이만 허용한다. 기준을 바꾸려면 실제 화면을 검토한 뒤 `npm run test:e2e:web -- --update-snapshots`를 사용한다. CI에서는 갱신하지 않는다. Linux CI에서도 이 기준 이미지로 통과를 확인했다. 이후 실패 시에는 diff를 검토하고, 자동 기준 갱신으로 실패를 숨기지 않는다.

## 2026-10-18 1차 UX 개선 검증

최종 Playwright 35개, 단위·계약 102개, Maestro YAML 7개 형식 검사를 로컬에서 통과했다. 네이티브 Maestro 실행 통과를 뜻하지 않는다. 새 회귀는 메뉴 Enter 선택, 시트 포커스 격리·Escape·복귀, 헤더 조작 영역, 체크박스 선택→API→초기화, 로그인 인라인 오류·비밀번호 표시·거절 후 값 유지, 배너 자동 전환·정지·키보드 포커스·재개·모션 감소, 홈 부분 실패·부분 재시도, 이미지 버튼 이동, 글꼴 지연·실패, 상품 텍스트 대비를 검사한다.

Expo SDK 57의 웹 글꼴 로더는 CSS 등록 상태로 준비 여부를 판단할 수 있어, 다운로드가 지연돼도 본문이 먼저 사용 가능했다. 지연 회귀는 본문이 사용 가능하거나 대기 화면의 기본 글꼴 계속 버튼으로 진행 가능한 계약을 검사한다. 실제 네이티브의 4초 대기 버튼과 cold-start 시간은 별도 기기 검증 대상이다.

디자인 비교는 기존 16개 화면 쌍 캡처 외에 `rn-archive-filter.png`, `rn-sign-in-error.png`를 저장한다. 잘못된 예시 이메일은 제출하지 않는다. 실제 데이터에 없는 상품 이미지·가격을 AI 시안에서 복사하지 않았다.

## Glassmorphism 후속 회귀

Glassmorphism 변경 시점의 Playwright는 37개였다. 주문 동의 체크박스의 Space 선택·해제와 결제 전 입력 검증, `filter-selected-mobile.png` 시각 기준을 추가했다. 아카이브·로그인 화면 기준은 변경된 공통 컨트롤을 직접 검토한 뒤 갱신했다. `design:compare`는 체크박스 선택 캡처까지 총 19개를 생성한다. [플랫폼 지원과 검증 범위](../.scratch/rn-ux-review/GLASS-CONTROLS.md)를 참고한다.

## 예약·게시판·쇼핑 동기화와 본문 여백 (2026-10-18)

현재 기본 회귀는 Playwright 48개이며, 아래 웹 원본 비교를 켜면 49개입니다. 커뮤니티 3페이지 누적·검색 초기화·추가 로딩 오류/재시도, 아카이브/상품 추가 로딩, 화면 이동 없는 게시판/쇼핑 탭, 이동 언더라인과 모션 줄이기, 예약 신청/수정, 본문 빈 줄의 실제 높이를 검사합니다.

`08-community-design.yaml`, `09-shopping.yaml`을 포함한 9개 Maestro top-level flow를 제공합니다. YAML 검사는 실행 검증이 아닙니다. 네이티브 E2E는 위 Android/iOS 실행 환경에서 별도로 실행하세요.

웹과 RN을 동일한 합성 데이터로 비교하려면 인접한 `../whiskynavi` 웹 저장소와 설치된 웹 의존성이 필요합니다. 별도 터미널에서 다음을 실행합니다.

```sh
node scripts/web-source-compare.mjs
```

이 명령은 소스·정적 파일·필수 설정만 임시 폴더에 복사하고 3101 포트에서 실행합니다. `.env`·Git·자격증명 파일은 복사하지 않습니다. 서버가 출력하는 `COMPARE_WEB_DIRECTORY` 경로를 사용해 다른 터미널에서 실행합니다.

```sh
COMPARE_WEB_DIRECTORY='서버가 출력한 임시 경로' \
COMPARE_WEB_ORIGIN=http://localhost:3101 npm run test:e2e:web
```

비교는 예약 목록/상세/신청 영역, 커뮤니티 목록/상세, 소식, 마이페이지, 일반상품 목록/상세와 구매 버튼 영역, 이용권, 스마트오더, 앱 쇼핑 진입을 375/390/430px에서 캡처합니다. 결과와 `focused-report.json`은 `artifacts/design-sync/`에 저장합니다. 실제 계정 대신 로컬 테스트 세션을 사용합니다. 브라우저의 외부 요청은 모두 차단하며, 웹에 포함된 Vercel 분석 스크립트의 차단 시도만 알려진 항목으로 보고합니다. 그 외 외부 origin이나 렌더링 오류는 실패입니다.

기본 CI에서는 인접 웹 저장소가 필요 없는 48개 회귀만 실행하고 원본 비교 1개는 건너뜁니다. 위 비교는 RN 웹 미리보기이며 실기기 캡처나 Maestro 실행 결과를 의미하지 않습니다.

## 쇼핑·마이페이지 후속 회귀

계정 요약 → 주문/예약 → 프로필 수정 → 멤버십/사업자 → 문의 이동을 검사한다. 375/390/430px에서 카드 이미지 영역의 폭 비율, 카드의 세로 비율, 구매 버튼의 나란한 정렬과 48px 터치 높이, 아이콘을 확인하고 320px에서는 구매 버튼이 세로로 전환되는지 확인한다. `02-auth-profile.yaml`에도 내 정보 수정 진입을 추가했다. 네이티브 flow의 로컬 결과는 YAML 검사이며 실제 Maestro 실행이 아니다.

원본 웹의 예약 타이머는 서버/브라우저가 초 경계를 사이에 두고 렌더링하면 hydration 불일치가 생길 수 있다. 이번 비교에서도 1회 관찰했다. 비교기는 이 오류를 숨기지 않고 실패로 기록한다. 원본 웹 타이머 코드는 이번 RN 디자인 작업에서 변경하지 않았다.

## 전역 스켈레톤과 마이페이지 하위 화면 (2026-10-19)

현재 기본 브라우저 회귀는 78개이며 선택적 웹 원본 비교를 켜면 79개다. 23개 화면의 API 응답을 보류한 뒤 해제해 실제 스켈레톤→내용 전환을 확인한다. 모션 줄이기·busy 상태·오류/재시도·추가 페이지·백그라운드 갱신·이미지 성공/실패를 검사한다. 12개 마이페이지 하위 화면은 320/390/430px와 844px 가로 화면에서 검사하고 390/430px 캡처를 저장한다. 적용 계약과 미검증 경계는 [로딩 안내](../docs/mobile-loading.md)에 있다.

`/__test/seed-account`는 로컬 메모리에 합성 주문/예약/문의만 준비한다. `10-account-child-pages.yaml`과 helpers/seed-account.js는 이를 재사용한다. 네이티브 런타임 실행은 별도 도구가 필요하며 YAML 검사로 대신하지 않는다.
