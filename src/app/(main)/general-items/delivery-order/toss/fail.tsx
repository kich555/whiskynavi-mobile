import { PaymentResultScreen } from "@/features/orders/screens";
export default function Route() {
  return <PaymentResultScreen success={false} channel="cart" />;
}
