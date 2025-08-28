/**
 * 공통 토큰 처리 유틸리티
 * 모든 서비스에서 일관된 Cognito JWT 토큰 처리를 위한 공통 함수들
 */

// Cognito JWT 토큰 가져오기
export const getCognitoToken = () => {
  try {
    const savedTokens = localStorage.getItem('cognitoTokens');
    if (!savedTokens) return null;
    
    const tokens = JSON.parse(savedTokens);
    
    // 다양한 토큰 키 이름 지원
    const token = tokens.accessToken || tokens.idToken || tokens.access_token || tokens.id_token;
    
    if (token) return token;
    return null;
  } catch (error) {
    return null;
  }
};

// 인증 헤더 생성
export const createAuthHeaders = (additionalHeaders = {}) => {
  const token = getCognitoToken();
  
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...additionalHeaders
  };
};

// JWT 토큰 만료 여부 확인
export const isTokenExpired = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const tokenData = JSON.parse(atob(base64));
    
    const currentTime = Math.floor(Date.now() / 1000);
    return tokenData.exp && tokenData.exp < currentTime;
  } catch (error) {
    return true; // 파싱 실패 시 만료된 것으로 처리
  }
};

// 토큰 유효성 검사
export const isTokenValid = () => {
  const token = getCognitoToken();
  if (!token) return false;
  
  return !isTokenExpired(token);
};

// 만료된 토큰 정리
export const clearExpiredTokens = () => {
  localStorage.removeItem('cognitoTokens');
  localStorage.removeItem('currentUser');
};

// 토큰 정보 디코딩
export const decodeToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch (error) {
    return null;
  }
};

// debugTokenStatus 제거(프로덕션 불필요)
