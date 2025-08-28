import UserService from './UserService';
import PostService from './PostService';
import CommentService from './CommentService';
import AuthService from './AuthService';

class ApiService {
  constructor() {
    this.userService = UserService;
    this.postService = PostService;
    this.commentService = CommentService;

    // 현재 저장된 cognitoTokens를 레거시 키로도 동기화
    // (다른 서비스 파일이 아직 accessToken/idToken만 읽더라도 동작하도록)
    this.syncLegacyTokenKeys();
  }

  // ---- 공통: cognitoTokens -> legacy 키 동기화 ----
  syncLegacyTokenKeys() {
    try {
      const tok = JSON.parse(localStorage.getItem('cognitoTokens') || '{}');
      if (tok?.accessToken) localStorage.setItem('accessToken', tok.accessToken);
      if (tok?.idToken)     localStorage.setItem('idToken', tok.idToken);
      if (tok?.refreshToken)localStorage.setItem('refreshToken', tok.refreshToken);
    } catch { /* noop */ }
  }

  // ---- 서비스 상태 확인 ----
  async checkServiceHealth() {
    const services = [
      { name: 'User Service',    url: process.env.REACT_APP_USER_SERVICE_URL    || 'http://localhost:8081' },
      { name: 'Post Service',    url: process.env.REACT_APP_POST_SERVICE_URL    || 'http://localhost:8082' },
      { name: 'Comment Service', url: process.env.REACT_APP_COMMENT_SERVICE_URL || 'http://localhost:8083' }
    ];

    const healthChecks = await Promise.allSettled(
      services.map(async (service) => {
        try {
          const response = await fetch(`${service.url}/health`);
          return {
            name: service.name,
            status: response.ok ? 'healthy' : 'unhealthy',
            url: service.url
          };
        } catch (error) {
          return {
            name: service.name,
            status: 'unreachable',
            url: service.url,
            error: error.message
          };
        }
      })
    );

    return healthChecks.map((result, index) =>
      result.status === 'fulfilled'
        ? result.value
        : {
            name: services[index].name,
            status: 'error',
            url: services[index].url,
            error: result.reason?.message || 'Unknown error',
          }
    );
  }

  // ---- 에러 공통 처리 ----
  handleError(error) {
  if (error.status === 401) {
    this.refreshCognitoToken().catch(() => {});
  }
  throw error;
}

async refreshCognitoToken() {
  try {
    const authService = await import('./AuthService');
    await authService.default.refreshToken();
  } catch (e) {
    await this.logout();
  }
}

  // ---- Cognito 토큰 갱신 ----
  async refreshCognitoToken() {
    try {
      const next = await AuthService.refreshToken(); // /oauth2/token 호출
      // 갱신된 토큰을 레거시 키에도 반영
      this.syncLegacyTokenKeys();
      return next;
    } catch (error) {
      console.error('토큰 갱신 실패:', error);
      await this.logout(); // 로컬 세션 정리
      throw error;
    }
  }

  // ---- 로그아웃 (모든 서비스) ----
  async logout() {
    try {
      // 백엔드 세션이 있다면 정리
      await Promise.allSettled([
        this.userService.logout(),
        // Post/Comment는 별도 로그아웃 없음
      ]);

      // 로컬 스토리지 정리 (AuthService에서 일괄 처리)
      await AuthService.logoutLocal();

      return true;
    } catch (error) {
      console.error('로그아웃 오류:', error);
      return false;
    }
  }

  // ---- API 응답 공통 처리 ----
  async handleResponse(response, serviceName) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        statusText: response.statusText,
        message: errorData.message || `${serviceName} 요청 실패`,
        data: errorData,
      };
    }
    return response.json();
  }

  // ---- 재시도 로직 (401 처리 내장) ----
  async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;

        // 401 Unauthorized → refresh 후 즉시 1회 재시도 (횟수 소모 없이)
        const status = error?.status ?? error?.response?.status;
        if (status === 401) {
          try {
            await this.refreshCognitoToken();
            // 바로 재시도 (i 감소 대신 continue)
            return await requestFn();
          } catch (e) {
            // refresh 실패 → 더 이상 진행 불가
            throw error;
          }
        }

        // 마지막 차례면 바로 throw
        if (i === maxRetries - 1) throw error;

        // 그 외 오류는 지수 백오프 비슷하게 대기 후 재시도
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      }
    }

    // 여기까지 오면 실패
    throw lastError;
  }
}

export default new ApiService();
