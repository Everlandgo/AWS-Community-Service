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
    
    if (token) {
      console.log('토큰 찾음:', token.substring(0, 20) + '...');
      return token;
    }
    
    console.warn('토큰을 찾을 수 없음. 저장된 토큰:', tokens);
    return null;
  } catch (error) {
    console.warn('토큰 파싱 실패:', error);
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
    console.warn('토큰 만료 확인 실패:', error);
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
    console.warn('토큰 디코딩 실패:', error);
    return null;
  }
};

// 토큰 상태 디버깅
export const debugTokenStatus = () => {
  console.log('=== 토큰 상태 디버깅 ===');
  
  const savedTokens = localStorage.getItem('cognitoTokens');
  const currentUser = localStorage.getItem('currentUser');
  
  console.log('저장된 토큰:', savedTokens);
  console.log('현재 사용자:', currentUser);
  
  if (savedTokens) {
    try {
      const tokens = JSON.parse(savedTokens);
      console.log('파싱된 토큰 객체:', tokens);
      console.log('토큰 키들:', Object.keys(tokens));
      
      const token = getCognitoToken();
      if (token) {
        const decoded = decodeToken(token);
        console.log('디코딩된 토큰:', decoded);
        console.log('토큰 만료 시간:', new Date(decoded?.exp * 1000));
        console.log('현재 시간:', new Date());
        console.log('토큰 만료 여부:', isTokenExpired(token));
      }
    } catch (error) {
      console.error('토큰 디버깅 중 오류:', error);
    }
  }
  
  console.log('========================');
};
