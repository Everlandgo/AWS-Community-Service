export const handler = async (event) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, service: 'hhottdogg-frontend', time: new Date().toISOString() })
  };
};
