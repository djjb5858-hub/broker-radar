// Vercel 서버리스 함수: 대전 서구 부동산중개업 오픈API 프록시
// 환경변수(Vercel > Settings > Environment Variables)
//   SEOGU_API_KEY    : 공공데이터포털(서구청) 인증키
//   SEOGU_KEY_PARAM  : (선택) 인증키 파라미터 이름. 기본값 serviceKey
const UPSTREAM = 'https://www.seogu.go.kr/seoguAPI/3660000/getEstateBrkpg';

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
    let key = process.env.SEOGU_API_KEY;
    if (!key) {
      return sendJson(res, 500, { error: { message: '서버 환경변수 SEOGU_API_KEY 가 설정되지 않았습니다.' } });
    }
    key = key.trim();
    if (/%[0-9A-Fa-f]{2}/.test(key)) { try { key = decodeURIComponent(key); } catch (e) {} } // Encoding 키 보정
    const keyParam = process.env.SEOGU_KEY_PARAM || 'serviceKey';

    const query = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
    const pageNo = Math.max(parseInt(query.pageNo, 10) || 1, 1);
    const numOfRows = Math.min(Math.max(parseInt(query.numOfRows, 10) || 100, 1), 1000);
    const url = `${UPSTREAM}?${keyParam}=${encodeURIComponent(key)}&pageNo=${pageNo}&numOfRows=${numOfRows}&resultType=json`;

    if (typeof fetch !== 'function') {
      return sendJson(res, 500, { error: { message: 'Node 런타임에 fetch 가 없습니다. Vercel 의 Node.js 버전을 18 이상으로 설정해 주세요.' } });
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    let upstream, text;
    try {
      upstream = await fetch(url, { signal: ctrl.signal });
      text = await upstream.text();
    } finally {
      clearTimeout(timer);
    }
    res.statusCode = upstream.status >= 100 && upstream.status < 600 ? upstream.status : 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (upstream.ok) res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    return res.end(text);
  } catch (e) {
    const cause = e && e.cause ? ' / ' + (e.cause.code || e.cause.message || e.cause) : '';
    try { return sendJson(res, 502, { error: { message: '서구청 API 호출 실패: ' + (e && e.message) + cause } }); }
    catch (_) { /* 응답 불가 */ }
  }
};
