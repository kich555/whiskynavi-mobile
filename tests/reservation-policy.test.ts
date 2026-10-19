import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildInfoItems,
  calculateTimeRemaining,
  formatDateTime,
  formatReservationRole,
  getNoticeStatus,
  getStatusBadge,
} from "../src/features/reservation/policy";

afterEach(() => vi.useRealTimers());
describe("reservation timing and visibility contracts", () => {
  it("treats missing bounds as open and respects UTC offsets at the exact start", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-19T01:00:00Z"));
    expect(getNoticeStatus({})).toBe("active");
    expect(
      getNoticeStatus({ reservationStartAt: "2026-10-19T01:00:00Z" }),
    ).toBe("active");
    expect(
      getNoticeStatus({ reservationStartAt: "2026-10-19T10:00:01+09:00" }),
    ).toBe("pending");
    expect(
      getNoticeStatus({ reservationEndAt: "2026-10-19T10:00:00+0900" }),
    ).toBe("closed");
  });
  it("clamps expired countdowns and displays days through seconds", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-19T00:00:00Z"));
    expect(calculateTimeRemaining(new Date("2026-10-18T23:59:59Z"))).toBe(
      "00일 00시간 00분 00초",
    );
    expect(calculateTimeRemaining(new Date("2026-10-20T02:03:04Z"))).toBe(
      "01일 02시간 03분 04초",
    );
  });
  it("does not reveal supply prices to ordinary members or hidden inventory", () => {
    const notice = {
      bottleBrand: "테스트 브랜드",
      price: 12000,
      supplyPrice: 9000,
      availableQuantity: 2,
    };
    expect(buildInfoItems(notice)).toEqual([
      { label: "브랜드", value: "테스트 브랜드" },
      { label: "소매가", value: "12,000원" },
      { label: "가용 수량", value: "2병" },
    ]);
    expect(
      buildInfoItems(notice, {
        hasBusinessRole: true,
        hideAvailableQuantity: true,
      }),
    ).toEqual([
      { label: "브랜드", value: "테스트 브랜드" },
      { label: "소매가", value: "12,000원" },
      { label: "공급가", value: "9,000원" },
    ]);
    expect(buildInfoItems({}, { hasBusinessRole: true })).toEqual([]);
    expect(
      buildInfoItems(
        { price: 0, supplyPrice: 0, availableQuantity: 0 },
        { hasBusinessRole: true },
      ),
    ).toEqual([
      { label: "소매가", value: "0원" },
      { label: "공급가", value: "0원" },
      { label: "가용 수량", value: "0병" },
    ]);
  });
  it("keeps unknown roles visible and gives missing values a placeholder", () => {
    expect(formatReservationRole()).toBe("-");
    expect(formatReservationRole("ROLE_USER")).toBe("일반 회원");
    expect(formatReservationRole("ROLE_FUTURE")).toBe("ROLE_FUTURE");
    expect(formatDateTime()).toBe("-");
    expect(formatDateTime("2026-10-19T12:00:00+09:00")).toContain("2026");
  });
  it.each([
    ["pending", "예약 대기 중"],
    ["active", "예약 진행 중"],
    ["applied", "예약신청완료"],
    ["closed", "예약 종료됨"],
  ] as const)("labels %s accurately", (status, label) => {
    expect(getStatusBadge(status).label).toBe(label);
  });
});
