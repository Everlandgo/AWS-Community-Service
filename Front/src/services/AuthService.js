class AuthService {
  // Cognito JWT 토큰 유효성 검사
  isTokenValid() {
    const savedTokens = sessionStorage.getItem('cognitoTokens');
    if (!savedTokens) return false;
    
    try {
      const tokens = JSON.parse(savedTokens);
      const accessToken = tokens.access_token || tokens.id_token;
      
      if (!accessToken) return false;
      
      // JWT 토큰 만료 여부 확인
      const base64Url = accessToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const tokenData = JSON.parse(atob(base64));
      
      const currentTime = Math.floor(Date.now() / 1000);
      return tokenData.exp && tokenData.exp > currentTime;
    } catch (error) {
      console.warn('토큰 검증 실패:', error);
      return false;
    }
  }

  // 현재 저장된 Cognito 토큰 가져오기
  getStoredTokens() {
    const savedTokens = sessionStorage.getItem('cognitoTokens');
    if (!savedTokens) return null;
    
    try {
      return JSON.parse(savedTokens);
    } catch (error) {
      console.warn('토큰 파싱 실패:', error);
      return null;
    }
  }

  // 토큰 만료 시 정리
  clearExpiredTokens() {
    sessionStorage.removeItem('cognitoTokens');
    sessionStorage.removeItem('currentUser');
  }
}

export default new AuthService();
