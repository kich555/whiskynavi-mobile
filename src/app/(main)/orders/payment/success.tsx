import { PaymentResultScreen } from "@/features/orders/screens";
export default function Route() {
  return <PaymentResultScreen success={true} channel="cart" />;
}
