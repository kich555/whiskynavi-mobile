import { Screen, Label, NavLink } from "@/components/native/ui";
export default function NotFound() {
  return (
    <Screen title="화면을 찾을 수 없습니다">
      <Label>주소가 변경되었거나 사용할 수 없는 화면입니다.</Label>
      <NavLink href="/">홈으로 돌아가기</NavLink>
    </Screen>
  );
}
