'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ORIGIN_PRESETS } from '../src/data/constants';

// 기본값이 채워져 있어 그대로 제출해도 추천을 받을 수 있다 (요구사항: 전부 입력 불필요)
export function RecommendForm({ movieId, defaultDate }: { movieId: number; defaultDate: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const qs = new URLSearchParams({
      movieId: String(movieId),
      date: String(fd.get('date')),
      originId: String(fd.get('originId')),
      maxTravelMinutes: String(fd.get('maxTravelMinutes')),
      maxPrice: String(fd.get('maxPrice')),
      priority: String(fd.get('priority')),
      // 체크박스는 미체크 시 폼 데이터에 없으므로 명시적으로 true/false를 만든다
      allowImax: String(fd.get('allowImax') === 'on'),
      allowDolby: String(fd.get('allowDolby') === 'on'),
      allowStandard: String(fd.get('allowStandard') === 'on'),
      motionSickness: String(fd.get('motionSickness')),
      subtitleReadability: String(fd.get('subtitleReadability') === 'on'),
      neckComfort: String(fd.get('neckComfort') === 'on'),
      wheelchair: String(fd.get('wheelchair') === 'on'),
    });
    router.push(`/results?${qs.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} aria-label="추천 조건 입력">
      <label className="field">
        <span>관람 날짜</span>
        <input type="date" name="date" defaultValue={defaultDate} required />
      </label>

      <label className="field">
        <span>출발 위치</span>
        <select name="originId" defaultValue="cityhall">
          {ORIGIN_PRESETS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>최대 이동 시간 (분)</span>
        <input type="number" name="maxTravelMinutes" defaultValue={60} min={5} max={240} step={5} />
      </label>

      <label className="field">
        <span>최대 가격 (원)</span>
        <input type="number" name="maxPrice" defaultValue={40000} min={1000} max={200000} step={1000} />
      </label>

      <label className="field">
        <span>가장 중요한 것</span>
        <select name="priority" defaultValue="balance">
          <option value="balance">균형 있게</option>
          <option value="quality">영상·음향 품질</option>
          <option value="logistics">가까운 곳·가성비</option>
        </select>
      </label>

      <fieldset style={{ border: '1px solid var(--border)', borderRadius: 12, marginBottom: 14 }}>
        <legend className="sub">허용할 상영 방식</legend>
        <label className="checkline">
          <input type="checkbox" name="allowImax" defaultChecked /> IMAX 허용
        </label>
        <label className="checkline">
          <input type="checkbox" name="allowDolby" defaultChecked /> Dolby Cinema 허용
        </label>
        <label className="checkline">
          <input type="checkbox" name="allowStandard" defaultChecked /> 일반관(대형관 포함) 허용
        </label>
      </fieldset>

      <label className="field">
        <span>4DX 멀미 민감도</span>
        <select name="motionSickness" defaultValue="0">
          <option value="0">민감하지 않음 — 4DX 후보 유지</option>
          <option value="1">약간 민감 — 4DX 후보 유지</option>
          <option value="2">많이 민감 — 4DX 제외</option>
        </select>
      </label>

      <fieldset style={{ border: '1px solid var(--border)', borderRadius: 12, marginBottom: 14 }}>
        <legend className="sub">좌석·편의 선호</legend>
        <label className="checkline">
          <input type="checkbox" name="subtitleReadability" /> 자막 가독성 우선 (좌석 구역 추천에 반영)
        </label>
        <label className="checkline">
          <input type="checkbox" name="neckComfort" /> 목 부담 적은 좌석 선호
        </label>
        <label className="checkline">
          <input type="checkbox" name="wheelchair" /> 휠체어 접근 필수 (미확인 상영관은 제외됩니다)
        </label>
      </fieldset>

      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
        {submitting ? '추천 계산 중…' : '추천 받기'}
      </button>
    </form>
  );
}
