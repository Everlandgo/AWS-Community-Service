export const handler = async () => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ok: true, service: 'msa-dev', time: new Date().toISOString() })
});
