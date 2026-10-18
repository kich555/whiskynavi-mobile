export function positiveId(value: unknown): number | null {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const result = Number(value);
  return Number.isSafeInteger(result) ? result : null;
}
export function safeReturnPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\r\n]/.test(value)
  )
    return "/";
  return value;
}
export function matchesCallback(candidate: string, expected: string): boolean {
  try {
    const next = new URL(candidate),
      target = new URL(expected);
    return (
      next.protocol === "https:" &&
      next.origin === target.origin &&
      next.pathname === target.pathname
    );
  } catch {
    return false;
  }
}
export function validatePaymentReturn(
  candidate: string,
  expected: { successUrl: string; pgOrderId: string; amount: number },
) {
  if (!matchesCallback(candidate, expected.successUrl))
    throw new Error("결제 결과 주소가 일치하지 않습니다.");
  const params = new URL(candidate).searchParams;
  if (
    params.get("orderId") !== expected.pgOrderId ||
    Number(params.get("amount")) !== expected.amount ||
    !params.get("paymentKey")
  )
    throw new Error(
      "결제 요청과 결과가 일치하지 않습니다. 주문 내역을 확인해 주세요.",
    );
  return {
    pgOrderId: expected.pgOrderId,
    amount: expected.amount,
    paymentKey: params.get("paymentKey")!,
  };
}
