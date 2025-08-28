// src/aws-config.js
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

// 1) .env에서 읽기
let USER_POOL_ID = process.env.REACT_APP_COGNITO_USER_POOL_ID;
let CLIENT_ID    = process.env.REACT_APP_COGNITO_CLIENT_ID;

// 2) (선택) 컨테이너 런타임 주입 방식을 쓸 때 window._env_도 체크
if (!USER_POOL_ID && typeof window !== 'undefined' && window._env_) {
  USER_POOL_ID = window._env_.REACT_APP_COGNITO_USER_POOL_ID;
}
if (!CLIENT_ID && typeof window !== 'undefined' && window._env_) {
  CLIENT_ID = window._env_.REACT_APP_COGNITO_CLIENT_ID;
}

// 3) (개발용) 임시 폴백 — 프로덕션에서는 제거 권장
if (!USER_POOL_ID || !CLIENT_ID) {
  console.error(
    '[aws-config] Missing env. ' +
    'Check .env at the React app root and restart the dev server. Falling back to hard-coded dev values.'
  );
  USER_POOL_ID = USER_POOL_ID || 'ap-northeast-2_HnquQbxZ4';
  CLIENT_ID    = CLIENT_ID    || '47fnsb2rstr5ssi0lb68r2jeat';
}

export const cognitoConfig = {
  UserPoolId: USER_POOL_ID,
  ClientId: CLIENT_ID,
};

export const userPool = new CognitoUserPool(cognitoConfig);

// (선택) 직접 비번 로그인 헬퍼 — Hosted UI만 쓸 경우 안 써도 됩니다.
export function signIn(username, password) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: username, Pool: userPool });
    const auth = new AuthenticationDetails({ Username: username, Password: password });

    user.authenticateUser(auth, {
      onSuccess: (session) => {
        const idToken = session.getIdToken().getJwtToken();
        const accessToken = session.getAccessToken().getJwtToken();
        const refreshToken = session.getRefreshToken().getToken();
        localStorage.setItem('cognitoTokens', JSON.stringify({ idToken, accessToken, refreshToken }));
        resolve({ idToken, accessToken, refreshToken });
      },
      onFailure: (err) => reject(err),
    });
  });
}
