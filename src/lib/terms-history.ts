import * as previousTerms from "./terms-archive/2026-09-17";

// 개정 시 직전 약관의 원문과 공지 정보를 새 보관 파일로 추가합니다.
// 보관된 약관은 수정하지 않고 시행일별로 계속 유지합니다.
export const TERMS_HISTORY = [
  {
    version: "2026-09-17",
    noticeDate: previousTerms.TERMS_NOTICE_DATE,
    effectiveDate: previousTerms.TERMS_EFFECTIVE_DATE,
    changeReason: previousTerms.TERMS_CHANGE_REASON,
    representative: previousTerms.TERMS_REPRESENTATIVE,
    contactPhone: previousTerms.TERMS_CONTACT_PHONE,
    contactEmail: previousTerms.TERMS_CONTACT_EMAIL,
    sections: previousTerms.TERMS_SECTIONS,
  },
];
