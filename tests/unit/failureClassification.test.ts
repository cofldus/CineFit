import { describe, expect, it } from 'vitest';
import {
  classifyFeedbackReason,
  classifyFeedbackReasons,
  FAILURE_CATEGORIES,
} from '../../src/domain/recommendation/failureClassification';

describe('추천 실패 원인 분류', () => {
  it('데이터 관련 이유는 대응하는 분류로 매핑된다', () => {
    expect(classifyFeedbackReason('showtime_missing')).toContain('SHOWTIME_MISSING');
    expect(classifyFeedbackReason('travel_time_inaccurate')).toEqual(['TRAVEL_TIME_ERROR']);
    expect(classifyFeedbackReason('price_mismatch')).toContain('PRICE_ERROR');
  });

  it('긍정적인 이유는 빈 배열을 반환한다(실패 아님)', () => {
    expect(classifyFeedbackReason('reason_understood')).toEqual([]);
    expect(classifyFeedbackReason('wanted_cinema_appeared')).toEqual([]);
  });

  it('하나의 이유가 여러 분류에 동시에 해당할 수 있다', () => {
    const result = classifyFeedbackReason('showtime_missing');
    expect(result.length).toBeGreaterThan(1);
  });

  it('여러 이유를 합치면 중복 없이 반환된다', () => {
    const result = classifyFeedbackReasons(['showtime_missing', 'too_few_candidates']);
    // 둘 다 DATA_MISSING을 포함하므로 중복 제거 확인
    expect(result.filter((c) => c === 'DATA_MISSING')).toHaveLength(1);
  });

  it('모든 분류 코드에 라벨이 있다', async () => {
    const { FAILURE_CATEGORY_LABELS } = await import('../../src/domain/recommendation/failureClassification');
    for (const category of FAILURE_CATEGORIES) {
      expect(FAILURE_CATEGORY_LABELS[category]).toBeTruthy();
    }
  });
});
