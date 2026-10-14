// Vercel 서버리스 함수: NAVER API HUB 뉴스 검색 프록시
// 환경변수(Vercel > Settings > Environment Variables)
//   NAVER_API_HUB_ID     : NAVER API HUB 애플리케이션 Client ID
//   NAVER_API_HUB_SECRET : NAVER API HUB 애플리케이션 Client Secret
const UPSTREAM = 'https://naverapihub.apigw.ntruss.com/search/v1/news';

function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return sendJson(res, 405, { error: { message: 'GET 요청만 지원합니다.' } });
    }
    const id = (process.env.NAVER_API_HUB_ID || '').trim();
    const secret = (process.env.NAVER_API_HUB_SECRET || '').trim();
    if (!id || !secret) {
      return sendJson(res, 500, { error: { message: '서버 환경변수(NAVER_API_HUB_ID / NAVER_API_HUB_SECRET)가 설정되지 않았습니다.' } });
    }
    const query = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
    const q = String(query.query || '').trim();
    if (!q) return sendJson(res, 400, { error: { message: 'query 파라미터가 필요합니다.' } });
    const display = Math.min(Math.max(parseInt(query.display, 10) || 10, 1), 100);
    const start = Math.min(Math.max(parseInt(query.start, 10) || 1, 1), 1000);
    const sort = query.sort === 'sim' ? 'sim' : 'date';

    if (typeof fetch !== 'function') {
      return sendJson(res, 500, { error: { message: 'Node 런타임에 fetch 가 없습니다. Vercel 의 Node.js 버전을 18 이상으로 설정해 주세요.' } });
    }
    const url = `${UPSTREAM}?query=${encodeURIComponent(q)}&display=${display}&start=${start}&sort=${sort}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    let upstream, text;
    try {
      upstream = await fetch(url, { headers: { 'X-NCP-APIGW-API-KEY-ID': id, 'X-NCP-APIGW-API-KEY': secret }, signal: ctrl.signal });
      text = await upstream.text();
    } finally {
      clearTimeout(timer);
    }
    res.statusCode = upstream.status >= 100 && upstream.status < 600 ? upstream.status : 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (upstream.ok) res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.end(text);
  } catch (e) {
    const cause = e && e.cause ? ' / ' + (e.cause.code || e.cause.message || e.cause) : '';
    try { return sendJson(res, 502, { error: { message: '네이버 API 호출 실패: ' + (e && e.message) + cause } }); }
    catch (_) { /* 응답 불가 */ }
  }
};
