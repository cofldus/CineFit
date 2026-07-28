// 사용자 제보 신뢰도 정책 — 숫자는 이 설정 파일에서만 관리한다.
// 근거(docs/DATA-PROMOTION-POLICY.md): 단일 제보는 문서 05 §4.9의 사용자 제보(단일) 0.5를
// 기준으로, 증빙·복수 일치에 따라 제한적으로 상향한다. 공식 확인 없이 0.75를 넘지 않는다.
export const REPORT_CONFIDENCE_CAPS = {
  /** 단일 사용자 제보 상한 */
  singleUserReport: 0.55,
  /** 증빙 URL이 있는 단일 제보 상한 */
  singleWithEvidence: 0.65,
  /** 서로 다른 세션의 복수 독립 제보 일치 상한 */
  multipleIndependent: 0.75,
} as const;

export interface ReportEvidence {
  hasEvidenceUrl: boolean;
  independentReportCount: number; // 동일 대상·유형의 서로 다른 세션 제보 수 (본인 포함)
}

/** 관리자가 요청한 confidence를 정책 상한으로 제한한다. official 승격은 이 함수 대상이 아니다. */
export function capReportConfidence(requested: number, evidence: ReportEvidence): number {
  const cap =
    evidence.independentReportCount >= 2
      ? REPORT_CONFIDENCE_CAPS.multipleIndependent
      : evidence.hasEvidenceUrl
        ? REPORT_CONFIDENCE_CAPS.singleWithEvidence
        : REPORT_CONFIDENCE_CAPS.singleUserReport;
  return Math.max(0.05, Math.min(requested, cap));
}

/** 사용자 제보 승인 시 관찰의 info_status — 공식 근거 없이는 절대 official/multi_source 금지 */
export const USER_REPORT_INFO_STATUS = 'user_report' as const;
