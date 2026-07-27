'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ORIGIN_PRESETS } from '../src/data/constants';

const inputCls =
  'min-h-11 w-full rounded-card border border-border bg-bg px-3 text-base text-text outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface';
const labelCls = 'block text-sm font-semibold text-text';
const sectionCls = 'rounded-card-lg border border-border bg-surface p-4';
const checkRowCls = 'flex min-h-11 items-center gap-2.5 text-[15px] text-text';
const checkboxCls = 'h-5 w-5 accent-primary';

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
    <form onSubmit={onSubmit} aria-label="추천 조건 입력" className="flex flex-col gap-4">
      <div className={sectionCls}>
        <h2 className="m-0 mb-3 text-sm font-bold text-text-sub">언제, 어디서 출발하세요?</h2>
        <div className="flex flex-col gap-3.5">
          <label className="block">
            <span className={labelCls}>관람 날짜</span>
            <input className={`${inputCls} mt-1.5`} type="date" name="date" defaultValue={defaultDate} required />
          </label>
          <label className="block">
            <span className={labelCls}>출발 위치</span>
            <select className={`${inputCls} mt-1.5`} name="originId" defaultValue="cityhall">
              {ORIGIN_PRESETS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className={sectionCls}>
        <h2 className="m-0 mb-3 text-sm font-bold text-text-sub">이동·가격 조건</h2>
        <div className="flex flex-col gap-3.5">
          <label className="block">
            <span className={labelCls}>최대 이동 시간 (분)</span>
            <input
              className={`${inputCls} mt-1.5`}
              type="number"
              name="maxTravelMinutes"
              defaultValue={60}
              min={5}
              max={240}
              step={5}
            />
          </label>
          <label className="block">
            <span className={labelCls}>최대 가격 (원)</span>
            <input
              className={`${inputCls} mt-1.5`}
              type="number"
              name="maxPrice"
              defaultValue={40000}
              min={1000}
              max={200000}
              step={1000}
            />
          </label>
          <label className="block">
            <span className={labelCls}>가장 중요한 것</span>
            <select className={`${inputCls} mt-1.5`} name="priority" defaultValue="balance">
              <option value="balance">균형 있게</option>
              <option value="quality">영상·음향 품질</option>
              <option value="logistics">가까운 곳·가성비</option>
            </select>
          </label>
        </div>
      </div>

      <fieldset className={`${sectionCls} m-0 border`}>
        <legend className="mb-2 px-0.5 text-sm font-bold text-text-sub">허용할 상영 방식</legend>
        <div className="flex flex-col gap-1">
          <label className={checkRowCls}>
            <input className={checkboxCls} type="checkbox" name="allowImax" defaultChecked /> IMAX 허용
          </label>
          <label className={checkRowCls}>
            <input className={checkboxCls} type="checkbox" name="allowDolby" defaultChecked /> Dolby Cinema 허용
          </label>
          <label className={checkRowCls}>
            <input className={checkboxCls} type="checkbox" name="allowStandard" defaultChecked /> 일반관(대형관 포함)
            허용
          </label>
        </div>
      </fieldset>

      <div className={sectionCls}>
        <label className="block">
          <span className={labelCls}>4DX 멀미, 얼마나 신경 쓰이세요?</span>
          <select className={`${inputCls} mt-1.5`} name="motionSickness" defaultValue="0">
            <option value="0">괜찮아요 — 4DX도 추천에 포함</option>
            <option value="1">조금 신경 쓰여요 — 4DX도 추천에 포함</option>
            <option value="2">많이 힘들어요 — 4DX는 제외해 주세요</option>
          </select>
        </label>
      </div>

      <fieldset className={`${sectionCls} m-0 border`}>
        <legend className="mb-2 px-0.5 text-sm font-bold text-text-sub">좌석·편의 선호</legend>
        <div className="flex flex-col gap-1">
          <label className={checkRowCls}>
            <input className={checkboxCls} type="checkbox" name="subtitleReadability" /> 자막이 잘 보이는 좌석
            우선
          </label>
          <label className={checkRowCls}>
            <input className={checkboxCls} type="checkbox" name="neckComfort" /> 목 덜 아픈 좌석 우선
          </label>
          <label className={checkRowCls}>
            <input className={checkboxCls} type="checkbox" name="wheelchair" /> 휠체어 접근 필수 (확인 안 된 상영관은
            제외돼요)
          </label>
        </div>
      </fieldset>

      <button
        type="submit"
        className="flex min-h-12 w-full items-center justify-center rounded-card bg-primary text-base font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        disabled={submitting}
      >
        {submitting ? '추천 계산 중…' : '추천 받기'}
      </button>
    </form>
  );
}
