// 진단용 함수: 서버리스 함수가 실행되는지, Node 버전과 환경변수 설정 여부를 확인합니다. (확인 후 삭제해도 됩니다)
module.exports = (req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({
    ok: true,
    node: process.version,
    fetch: typeof fetch,
    SEOGU_API_KEY: !!process.env.SEOGU_API_KEY,
    NAVER_API_HUB_ID: !!process.env.NAVER_API_HUB_ID,
    NAVER_API_HUB_SECRET: !!process.env.NAVER_API_HUB_SECRET,
  }));
};
