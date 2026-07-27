import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <h1>
        영화에 <em style={{ color: 'var(--primary)', fontStyle: 'normal' }}>딱 맞는</em> 상영관
      </h1>
      <p>
        “이 영화를 내가 갈 수 있는 상영관 중 어디에서 보는 게 가장 만족스러울까?” — CineFit은 단순
        평점이 아니라 <strong>이유·단점·데이터 신뢰도까지 설명하는</strong> 상영관 추천을 만듭니다.
      </p>
      <p className="notice" role="note">
        ⚠️ 현재는 기술 검증(첫 마일스톤) 버전입니다. 회차·가격은 <strong>검증용 합성 데이터</strong>
        이며 실제 상영 정보가 아닙니다. 상영관 사양은 조사 자료 기반이며 항목별 출처·확인일을 함께
        표시합니다.
      </p>
      <Link href="/movies" className="btn btn-primary btn-block">
        추천 시작하기
      </Link>
    </main>
  );
}
