/**
 * 공통 토큰 처리 유틸리티
 * 모든 서비스에서 일관된 Cognito JWT 토큰 처리를 위한 공통 함수들
 * 세션 기반 로그인을 위해 sessionStorage 사용
 */

// 브라우저 종료 시 자동 로그아웃을 위한 이벤트 리스너 설정
export const setupTabCloseListener = () => {
  if (typeof window !== 'undefined') {
    const handleBeforeUnload = () => {
      // 브라우저가 완전히 종료될 때만 정리 (탭 닫기는 것은 제외)
      // sessionStorage는 유지하여 로그인 상태 보존
      logSessionEvent('BROWSER_CLOSING', { action: 'session_preserved' });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // 탭이 숨겨질 때 (다른 탭으로 이동하거나 최소화)
        logSessionEvent('TAB_HIDDEN', { visibilityState: document.visibilityState });
      }
    };

    // beforeunload 이벤트 (브라우저 종료 시)
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // visibilitychange 이벤트 (탭 전환 시)
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 클린업 함수 반환
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }
};

export const logSessionEvent = (event, details) => {
  console.log(`[Session] ${event}:`, details);
};

// Cognito JWT 토큰 가져오기 (sessionStorage 사용)
export const getCognitoToken = () => {
  try {
    const savedTokens = sessionStorage.getItem('cognitoTokens');
    if (!savedTokens) {
      logSessionEvent('TOKEN_NOT_FOUND', { storage: 'sessionStorage' });
      return null;
    }
    
    const tokens = JSON.parse(savedTokens);
    
    // 통일된 키 사용: id_token 또는 access_token
    const token = tokens.id_token || tokens.access_token;
    
    if (token) {
      logSessionEvent('TOKEN_RETRIEVED', { storage: 'sessionStorage' });
      return token;
    }
    
    logSessionEvent('TOKEN_INVALID_FORMAT', { tokens });
    return null;
  } catch (error) {
    logSessionEvent('TOKEN_PARSE_ERROR', { error: error.message });
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
  sessionStorage.removeItem('cognitoTokens');
  sessionStorage.removeItem('currentUser');
  logSessionEvent('TOKENS_CLEARED', { storage: 'sessionStorage' });
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

// 세션 상태 확인
export const checkSessionStatus = () => {
  const hasTokens = sessionStorage.getItem('cognitoTokens');
  const hasUser = sessionStorage.getItem('currentUser');
  
  if (!hasTokens || !hasUser) {
    logSessionEvent('SESSION_EXPIRED', { hasTokens: !!hasTokens, hasUser: !!hasUser });
    return false;
  }
  
  return true;
};

// 토큰 유실 시 자동 처리
export const handleTokenLoss = () => {
  logSessionEvent('TOKEN_LOSS_DETECTED', { action: 'redirect_to_login' });
  
  if (typeof window !== 'undefined') {
    // 현재 페이지가 로그인 페이지가 아닌 경우에만 리다이렉트
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login?reason=session_expired';
    }
  }
};

// 세션 만료 감지 및 처리
export const validateAndHandleSession = () => {
  if (!checkSessionStatus()) {
    handleTokenLoss();
    return false;
  }
  
  const token = getCognitoToken();
  if (!token || isTokenExpired(token)) {
    logSessionEvent('TOKEN_EXPIRED', { action: 'clear_and_redirect' });
    clearExpiredTokens();
    handleTokenLoss();
    return false;
  }
  
  return true;
};

// 토큰 저장 (sessionStorage 사용)
export const saveTokens = (tokens) => {
  try {
    sessionStorage.setItem('cognitoTokens', JSON.stringify(tokens));
    logSessionEvent('TOKENS_SAVED', { storage: 'sessionStorage' });
    return true;
  } catch (error) {
    logSessionEvent('TOKENS_SAVE_ERROR', { error: error.message });
    return false;
  }
};

// 사용자 정보 저장 (sessionStorage 사용)
export const saveUser = (user) => {
  try {
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    logSessionEvent('USER_SAVED', { storage: 'sessionStorage' });
    return true;
  } catch (error) {
    logSessionEvent('USER_SAVE_ERROR', { error: error.message });
    return false;
  }
};

// 토큰 관리: AWS Cognito에서 발급받은 JWT 토큰을 sessionStorage에 저장하고 가져오는 기능
// 인증 헤더 생성: API 요청 시 자동으로 Authorization: Bearer {token} 헤더를 추가
// 토큰 만료 확인: JWT 토큰의 만료 시간을 확인하여 유효성 검사
// 세션 관리: 사용자 로그인 상태와 세션 상태를 확인하고 관리
// 자동 리다이렉트: 토큰이 만료되거나 유실되었을 때 자동으로 로그인 페이지로 이동