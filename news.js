// Vercel 서버리스 함수: NAVER API HUB 뉴스 검색 프록시
// 환경변수(Vercel > Settings > Environment Variables)
//   NAVER_API_HUB_ID     : NAVER API HUB 애플리케이션 Client ID
//   NAVER_API_HUB_SECRET : NAVER API HUB 애플리케이션 Client Secret
const UPSTREAM = 'https://naverapihub.apigw.ntruss.com/search/v1/news';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: { message: 'GET 요청만 지원합니다.' } });
  }

  const id = process.env.NAVER_API_HUB_ID;
  const secret = process.env.NAVER_API_HUB_SECRET;
  if (!id || !secret) {
    return res.status(500).json({
      error: { message: '서버 환경변수(NAVER_API_HUB_ID / NAVER_API_HUB_SECRET)가 설정되지 않았습니다.' },
    });
  }

  // 허용한 파라미터만 전달
  const q = String(req.query.query || '').trim();
  if (!q) return res.status(400).json({ error: { message: 'query 파라미터가 필요합니다.' } });
  const display = Math.min(Math.max(parseInt(req.query.display, 10) || 10, 1), 100);
  const start = Math.min(Math.max(parseInt(req.query.start, 10) || 1, 1), 1000);
  const sort = req.query.sort === 'sim' ? 'sim' : 'date';

  const url = `${UPSTREAM}?query=${encodeURIComponent(q)}&display=${display}&start=${start}&sort=${sort}`;
  try {
    const upstream = await fetch(url, {
      headers: { 'X-NCP-APIGW-API-KEY-ID': id, 'X-NCP-APIGW-API-KEY': secret },
    });
    const text = await upstream.text();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (upstream.ok) res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(upstream.status).send(text);
  } catch (e) {
    return res.status(502).json({ error: { message: '네이버 API 호출 실패: ' + e.message } });
  }
};
