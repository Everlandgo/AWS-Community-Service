export const handler = async (event) => {
  const claims = event?.requestContext?.authorizer?.jwt?.claims || null;
  if (!claims) {
    return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'Unauthorized' }) };
  }
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, sub: claims.sub, email: claims.email, username: claims['cognito:username'] ?? claims.username }) };
};
