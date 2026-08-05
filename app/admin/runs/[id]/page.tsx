// R21 — 추천 실행 상세: 입력 조건·하드 필터 퍼널(전후 카운트)·후보별 4축 점수와
// soft penalty·제외 사유. "이 조건으로 재현" 링크로 같은 요청을 다시 실행할 수 있다.
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AXIS_LABELS, AXIS_ORDER } from '../../../../src/domain/recommendation/axisWeights';
import { recommendationRepository } from '../../../../src/data/recommendationRepository';
import { isAdminAuthed } from '../../../../src/lib/adminAuthServer';
import { replayUrl } from '../../../../src/lib/runReplay';

export const dynamic = 'force-dynamic';

const pct = (x: number) => `${Math.round(x * 100)}%`;

export default async function AdminRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed())) redirect('/admin/login');
  const id = Number((await params).id);
  const run = Number.isInteger(id) ? await recommendationRepository.getRunDetail(id) : null;
  if (!run) notFound();
  const trace = run.trace;
  const req = run.request;

  return (
    <main>
      <h1>추천 실행 #{run.id}</h1>
      <p className="sub">
        {run.createdAt} · 정책 {run.policyVersion ?? '—'} · 코드 {run.codeVersion ?? '—'} ·{' '}
        {run.latencyMs ?? '—'}ms
        {trace ? ` · 데이터 상태 ${trace.dataState}` : ''}
      </p>
      <p>
        <a href={replayUrl(req)} target="_blank" rel="noopener noreferrer">
          이 조건으로 재현 (새 실행) ↗
        </a>{' '}
        · <Link href="/admin/runs">목록으로</Link>
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>입력 조건</h2>
        <p className="sub" style={{ margin: 0 }}>
          영화 #{req.movieId} · {req.date} · 시간대 {req.timeWindow ?? 'any'}
          {req.timeWindow === 'custom' ? ` (${req.timeFrom}~${req.timeTo})` : ''} · 편도{' '}
          {req.maxTravelMinutes}분 · 우선순위 {req.priority}
          {req.prioritySecondary && req.prioritySecondary !== 'none' ? ` + ${req.prioritySecondary}` : ''} · 지불
          의향 {req.premiumAllowance ?? '—'}
          {typeof req.priceRef === 'number' ? ` (기준 ${req.priceRef.toLocaleString('ko-KR')}원)` : ''} · 멀미{' '}
          {req.motionSickness}
          {req.avoidBigScreen ? ' · 큰 화면 회피' : ''}
          {req.wheelchair ? ' · 휠체어 필요' : ''}
        </p>
        {trace ? (
          <p className="sub" style={{ marginBottom: 0 }}>
            가중치(합 100): {AXIS_ORDER.map((a) => `${AXIS_LABELS[a]} ${trace.axisWeights[a]}`).join(' · ')}
          </p>
        ) : null}
      </div>

      {trace ? (
        <>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>하드 필터 퍼널 — 전체 {trace.totalCandidates}개</h2>
            <div className="table-scroll" tabIndex={0} role="region" aria-label="하드 필터 퍼널 (가로 스크롤)">
              <table className="compare">
                <thead>
                  <tr>
                    <th>단계</th>
                    <th>제외</th>
                    <th>남은 후보</th>
                  </tr>
                </thead>
                <tbody>
                  {trace.funnel.map((f) => (
                    <tr key={f.stage}>
                      <td>{f.label}</td>
                      <td>{f.removed > 0 ? `−${f.removed}` : '·'}</td>
                      <td>{f.remaining}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>후보별 판정 ({trace.candidates.length}건)</h2>
            <div className="table-scroll" tabIndex={0} role="region" aria-label="후보별 판정 (가로 스크롤)">
              <table className="compare">
                <thead>
                  <tr>
                    <th>순위</th>
                    <th>회차</th>
                    <th>최종</th>
                    {AXIS_ORDER.map((a) => (
                      <th key={a}>{AXIS_LABELS[a]}</th>
                    ))}
                    <th>soft 감점</th>
                    <th>제외 사유</th>
                  </tr>
                </thead>
                <tbody>
                  {trace.candidates.map((c) => (
                    <tr key={`${c.showtimeId}-${c.rank ?? 'x'}`}>
                      <td>{c.rank ?? '제외'}</td>
                      <td>{c.label}</td>
                      <td>{typeof c.final === 'number' ? pct(c.final) : '—'}</td>
                      {AXIS_ORDER.map((a) => (
                        <td key={a}>{c.axisScores ? pct(c.axisScores[a]) : '—'}</td>
                      ))}
                      <td>
                        {c.softPenalties?.length
                          ? c.softPenalties.map((p) => `${p.note} (−${p.amount})`).join(' / ')
                          : '—'}
                      </td>
                      <td>{c.excludedReason ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card" role="note">
          이 실행에는 trace가 없어요 — R21 이전에 기록된 실행입니다.
        </div>
      )}
    </main>
  );
}
