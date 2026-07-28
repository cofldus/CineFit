import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  COMPLETENESS_LEVEL_LABELS,
  COMPLETENESS_LEVELS,
  summarizeByLevel,
  summarizeByRegion,
} from '../../../src/domain/dataQuality/completeness';
import { FAILURE_CATEGORY_LABELS } from '../../../src/domain/recommendation/failureClassification';
import { dataQualityRepository } from '../../../src/data/dataQualityRepository';
import { feedbackService } from '../../../src/data/feedbackService';
import { reportService } from '../../../src/data/reportService';
import { isAdminAuthed } from '../../../src/lib/adminAuthServer';
import { getAppClock } from '../../../src/lib/clock';

const RECENT_REPORT_DAYS = 7;

export default async function AdminQualityPage() {
  if (!(await isAdminAuthed())) redirect('/admin/login');

  const now = getAppClock().now();
  const [auditoriums, movieStats, showtimeStats, runStats, reports, failureCounts] = await Promise.all([
    dataQualityRepository.getAuditoriumQuality(now),
    dataQualityRepository.getMovieSpecStats(),
    dataQualityRepository.getShowtimeStats(),
    dataQualityRepository.getRecentRunStats(),
    reportService.list(),
    feedbackService.countFailureCategories(),
  ]);

  const levelCounts = summarizeByLevel(auditoriums);
  const regionalBreakdown = summarizeByRegion(auditoriums);
  const auditoriumsWithoutSeatZones = auditoriums.filter((a) => a.missing.includes('좌석 존')).length;
  const specsWithoutSource = auditoriums.filter((a) => a.missing.includes('출처')).length;

  const pendingReports = reports.filter((r) =>
    ['submitted', 'under_review', 'needs_more_information'].includes(r.status),
  );
  const recentCutoff = now.getTime() - RECENT_REPORT_DAYS * 86_400_000;
  const recentReports = reports.filter((r) => new Date(r.submitted_at).getTime() >= recentCutoff);

  const failureRows = Object.entries(failureCounts).filter(([, n]) => n > 0);

  return (
    <main>
      <h1>데이터 품질 대시보드</h1>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>운영 현황</h2>
        <ul className="plain">
          <li>
            확인된 영화 사양: <strong>{movieStats.moviesWithVerifiedSpec}</strong> / {movieStats.totalMovies}편
          </li>
          <li>
            활성 회차: <strong>{showtimeStats.activeCount}</strong>건 (검증용 합성 {showtimeStats.syntheticCount}건 포함)
          </li>
          <li>
            출처 없는 상영관 사양: <strong>{specsWithoutSource}</strong>개
          </li>
          <li>
            좌석 존 미등록 상영관: <strong>{auditoriumsWithoutSeatZones}</strong>개
          </li>
          <li>
            검토 대기 제보: <strong>{pendingReports.length}</strong>건 (최근 {RECENT_REPORT_DAYS}일 신규{' '}
            {recentReports.length}건) — <Link href="/admin/reports">제보 검토로 이동</Link>
          </li>
        </ul>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>상영관 데이터 완성도</h2>
        <p className="sub">
          "접근성" 항목은 현재 스키마에 전용 필드가 없어 채점에서 제외했습니다(알려진 데이터 한계 —
          docs/BETA-LIMITATIONS.md 참고). 사용자 제보 유형에는 accessibility가 있지만 상영관별
          접근성 인프라를 구조화해 저장하는 테이블은 아직 없습니다.
        </p>
        <ul className="plain">
          {COMPLETENESS_LEVELS.map((level) => (
            <li key={level}>
              {COMPLETENESS_LEVEL_LABELS[level]}: <strong>{levelCounts[level]}</strong>개
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>지역별 완성도</h2>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="지역별 완성도 (가로 스크롤)">
          <table className="compare">
            <thead>
              <tr>
                <th scope="col">지역</th>
                <th scope="col">전체</th>
                {COMPLETENESS_LEVELS.map((level) => (
                  <th scope="col" key={level}>
                    {COMPLETENESS_LEVEL_LABELS[level]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {regionalBreakdown.map((r) => (
                <tr key={r.regionCode}>
                  <td>{r.regionCode}</td>
                  <td>{r.total}</td>
                  {COMPLETENESS_LEVELS.map((level) => (
                    <td key={level}>{r.byLevel[level]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>추천 품질 신호 (최근 {runStats.totalRuns}건 실행 기준)</h2>
        <ul className="plain">
          <li>
            추천 없음: <strong>{runStats.noResultsCount}</strong>건
          </li>
          <li>
            저신뢰 후보 비율:{' '}
            <strong>
              {runStats.lowConfidenceCandidateRate === null
                ? '집계 불가(후보 없음)'
                : `${(runStats.lowConfidenceCandidateRate * 100).toFixed(1)}%`}
            </strong>
          </li>
        </ul>
        {failureRows.length > 0 && (
          <>
            <p className="sub">사용자 피드백 기반 실패 원인 분류(복수 원인 허용)</p>
            <ul className="plain">
              {failureRows.map(([category, n]) => (
                <li key={category}>
                  {FAILURE_CATEGORY_LABELS[category as keyof typeof FAILURE_CATEGORY_LABELS] ?? category}:{' '}
                  <strong>{n}</strong>건
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>상영관별 상세</h2>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="상영관별 완성도 (가로 스크롤)">
          <table className="compare">
            <thead>
              <tr>
                <th scope="col">상영관</th>
                <th scope="col">브랜드</th>
                <th scope="col">지역</th>
                <th scope="col">완성도</th>
                <th scope="col">누락 항목</th>
              </tr>
            </thead>
            <tbody>
              {auditoriums.map((a) => (
                <tr key={a.auditoriumId}>
                  <td>
                    {a.locationName} {a.auditoriumNo}
                  </td>
                  <td>{a.brand}</td>
                  <td>{a.regionCode ?? '미상'}</td>
                  <td>{COMPLETENESS_LEVEL_LABELS[a.level]}</td>
                  <td>{a.missing.length ? a.missing.join(', ') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
