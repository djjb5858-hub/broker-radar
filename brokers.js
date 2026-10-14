// Vercel 서버리스 함수: 대전 서구 부동산중개업 오픈API 프록시
// 환경변수(Vercel > Settings > Environment Variables)
//   SEOGU_API_KEY    : 공공데이터포털(서구청) 인증키
//   SEOGU_KEY_PARAM  : (선택) 인증키 파라미터 이름. 기본값 serviceKey
const UPSTREAM = 'https://www.seogu.go.kr/seoguAPI/3660000/getEstateBrkpg';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: { message: 'GET 요청만 지원합니다.' } });
  }
  let key = process.env.SEOGU_API_KEY;
  if (!key) {
    return res.status(500).json({ error: { message: '서버 환경변수 SEOGU_API_KEY 가 설정되지 않았습니다.' } });
  }
  if (/%[0-9A-Fa-f]{2}/.test(key)) { try { key = decodeURIComponent(key); } catch (e) {} } // Encoding 키 보정
  const keyParam = process.env.SEOGU_KEY_PARAM || 'serviceKey';

  const pageNo = Math.max(parseInt(req.query.pageNo, 10) || 1, 1);
  const numOfRows = Math.min(Math.max(parseInt(req.query.numOfRows, 10) || 100, 1), 1000);
  const url = `${UPSTREAM}?${keyParam}=${encodeURIComponent(key)}&pageNo=${pageNo}&numOfRows=${numOfRows}&resultType=json`;

  try {
    const upstream = await fetch(url, { signal: AbortSignal.timeout(20000) });
    const text = await upstream.text();
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    if (upstream.ok) res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    return res.status(upstream.status).send(text);
  } catch (e) {
    return res.status(502).json({ error: { message: '서구청 API 호출 실패: ' + e.message } });
  }
};
