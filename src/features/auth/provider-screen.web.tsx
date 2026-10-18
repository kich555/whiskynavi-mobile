import { Screen, Label, NavLink } from "@/components/native/ui";
export default function ProviderScreen() {
  return (
    <Screen title="휴대폰에서 계속해 주세요">
      <Label>
        NICE·토스 외부 화면 연결은 iOS/Android 앱에서 지원합니다. 웹
        미리보기에서는 실제 인증·결제를 진행할 수 없습니다.
      </Label>
      <NavLink href="/">홈으로</NavLink>
    </Screen>
  );
}
