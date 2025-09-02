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
    '[aws-config] Missing environment variables. ' +
    'Please check .env file and ensure REACT_APP_COGNITO_USER_POOL_ID and REACT_APP_COGNITO_CLIENT_ID are set.'
  );
  throw new Error('Cognito configuration is missing. Check your .env file.');
}

export const cognitoConfig = {
  UserPoolId: USER_POOL_ID,
  ClientId: CLIENT_ID,
};

export const userPool = new CognitoUserPool(cognitoConfig);

// 직접 비번 로그인 헬퍼 — Hosted UI만 쓸 경우 안 써도 됩니다.
export function signIn(username, password) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: username, Pool: userPool });
    const auth = new AuthenticationDetails({ Username: username, Password: password });

    user.authenticateUser(auth, {
      onSuccess: (session) => {
        const idToken = session.getIdToken().getJwtToken();
        const accessToken = session.getAccessToken().getJwtToken();
        const refreshToken = session.getRefreshToken().getToken();
        
        // 통일된 키로 저장
        const tokens = {
          id_token: idToken,
          access_token: accessToken,
          refresh_token: refreshToken
        };
        
        sessionStorage.setItem('cognitoTokens', JSON.stringify(tokens));
        resolve({ id_token: idToken, access_token: accessToken, refresh_token: refreshToken });
      },
      onFailure: (err) => reject(err),
    });
  });
}
