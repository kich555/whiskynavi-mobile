import { E2E_MODE } from "./runtime-config";
import type {
  UserOrderTicketResponse,
  NiceIdVerificationResultResponse,
} from "@/apis/generated/api";
export type PaymentChannel = "cart" | "direct" | "ticket" | "smart";
export type Flow =
  | {
      kind: "nice";
      url: string;
      returnUrl: string;
      sessionId: string;
      requestNo: string;
    }
  | {
      kind: "payment";
      channel: PaymentChannel;
      ticket: UserOrderTicketResponse;
      customerName: string;
      customerEmail: string;
      customerPhone: string;
    };
let flow: Flow | null = null;
let niceResult: NiceIdVerificationResultResponse | null = null;
const listeners = new Set<() => void>();
export const providerFlow = {
  get: () => flow,
  set(value: Flow | null) {
    flow = value;
  },
  niceResult: () => niceResult,
  completeNice(value: NiceIdVerificationResultResponse | null) {
    niceResult = value;
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
export function paymentHtml(flow: Extract<Flow, { kind: "payment" }>) {
  const t = flow.ticket;
  const args = JSON.stringify({
    clientKey: t.clientKey,
    card: { appScheme: E2E_MODE ? "whiskynavi-e2e://" : "whiskynavimobile://" },
    windowTarget: "self",
    orderId: t.pgOrderId,
    orderName: t.orderName,
    amount: { currency: "KRW", value: t.amount },
    successUrl: t.successUrl,
    failUrl: t.failUrl,
    customerEmail: flow.customerEmail,
    customerName: flow.customerName,
    customerMobilePhone: flow.customerPhone.replace(/\D/g, ""),
  }).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><body><p role="status">안전한 결제창을 열고 있습니다.</p><script src="https://js.tosspayments.com/v2/standard"></script><script>const args=${args};const {clientKey,...request}=args;TossPayments(clientKey).payment({customerKey:TossPayments.ANONYMOUS}).requestPayment({method:'CARD',...request}).catch(function(){document.querySelector('p').textContent='결제창을 열지 못했습니다. 돌아가서 다시 시도해 주세요.';});</script></body></html>`;
}
