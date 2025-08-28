// src/services/AuthService.js
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoRefreshToken,
} from 'amazon-cognito-identity-js';
import { userPool } from '../aws-config';

// 로컬스토리지에 저장/로드 도우미
function saveTokens({ idToken, accessToken, refreshToken }) {
  localStorage.setItem('cognitoTokens', JSON.stringify({ idToken, accessToken, refreshToken }));
}
function loadTokens() {
  try { return JSON.parse(localStorage.getItem('cognitoTokens') || '{}'); } catch { return {}; }
}
function clearTokens() {
  localStorage.removeItem('cognitoTokens');
  localStorage.removeItem('accessToken');         // 과거 잔재 제거
  localStorage.removeItem('idToken');             // 과거 잔재 제거
  localStorage.removeItem('backendAccessToken');  // 과거 잔재 제거
}

class AuthService {
  // 이메일을 Username으로 바꾸는(선택) API 사용
  async resolveUsernameFromEmail(email) {
    const base = process.env.REACT_APP_USERNAME_LOOKUP_URL;
    if (!base) return email;
    try {
      const url = base.includes('?')
        ? `${base}&email=${encodeURIComponent(email)}`
        : `${base}?email=${encodeURIComponent(email)}`;
      const res = await fetch(url);
      if (!res.ok) return email;
      const data = await res.json().catch(() => ({}));
      return data?.username || email;
    } catch {
      return email;
    }
  }

  // === Cognito 로그인 ===
  async login({ emailOrUsername, password }) {
    const username = await this.resolveUsernameFromEmail(emailOrUsername);
    const user = new CognitoUser({ Username: username, Pool: userPool });
    const auth = new AuthenticationDetails({ Username: username, Password: password });

    return new Promise((resolve, reject) => {
      user.authenticateUser(auth, {
        onSuccess: (session) => {
          const idToken = session.getIdToken().getJwtToken();
          const accessToken = session.getAccessToken().getJwtToken();
          const refreshToken = session.getRefreshToken().getToken();
          saveTokens({ idToken, accessToken, refreshToken });

          // 앱에서 쓰던 currentUser 형식도 맞춰 저장(필요시)
          const payload = JSON.parse(atob(idToken.split('.')[1]));
          const currentUser = {
            username,
            email: payload?.email,
            sub: payload?.sub,
            idToken,
            accessToken,
            refreshToken,
          };
          localStorage.setItem('currentUser', JSON.stringify(currentUser));
          resolve(currentUser);
        },
        onFailure: (err) => reject(err),
        newPasswordRequired: () => {
          reject(new Error('새 비밀번호가 필요합니다. (NEW_PASSWORD_REQUIRED)'));
        },
      });
    });
  }

  // === 세션 갱신 ===
  async refreshToken() {
    const { refreshToken } = loadTokens();
    if (!refreshToken) throw new Error('No refresh token');

    const cognitoRefreshToken = new CognitoRefreshToken({ RefreshToken: refreshToken });
    const currentUser = userPool.getCurrentUser();
    if (!currentUser) throw new Error('No current user');

    return new Promise((resolve, reject) => {
      currentUser.refreshSession(cognitoRefreshToken, (err, session) => {
        if (err) return reject(err);
        const idToken = session.getIdToken().getJwtToken();
        const accessToken = session.getAccessToken().getJwtToken();
        const newRefreshToken = session.getRefreshToken().getToken() || refreshToken;
        saveTokens({ idToken, accessToken, refreshToken: newRefreshToken });
        resolve({ idToken, accessToken, refreshToken: newRefreshToken });
      });
    });
  }

  // === 로그아웃 ===
  async logout() {
    try {
      userPool.getCurrentUser()?.signOut();
    } finally {
      clearTokens();
      localStorage.removeItem('currentUser');
    }
  }

  // === 현재 토큰 읽기 ===
  getStoredTokens() {
    return loadTokens();
  }
}

export default new AuthService();
