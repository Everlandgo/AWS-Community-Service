import UserService from './UserService';
import PostService from './PostService';
import CommentService from './CommentService';

class ApiService {
  constructor() {
    this.userService = UserService;
    this.postService = PostService;
    this.commentService = CommentService;
  }

  // 서비스 상태 확인
  async checkServiceHealth() {
    const services = [
      { name: 'User Service', url: process.env.REACT_APP_USER_SERVICE_URL || 'http://localhost:8081' },
      { name: 'Post Service', url: process.env.REACT_APP_POST_SERVICE_URL || 'http://localhost:8082' },
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
      result.status === 'fulfilled' ? result.value : {
        name: services[index].name,
        status: 'error',
        url: services[index].url,
        error: result.reason?.message || 'Unknown error'
      }
    );
  }

  // 에러 처리 공통 메서드
  handleError(error, serviceName = 'Unknown Service') {
    console.error(`${serviceName} 오류:`, error);
    
    if (error.status === 401) {
      // 인증 실패 시 Cognito 토큰 갱신 시도
      this.refreshCognitoToken();
    }
    
    throw error;
  }

  // Cognito 토큰 갱신
  async refreshCognitoToken() {
    try {
      // AuthService의 토큰 갱신 메서드 호출
      const authService = await import('./AuthService');
      await authService.default.refreshToken();
    } catch (error) {
      console.error('토큰 갱신 실패:', error);
      // 토큰 갱신 실패 시 로그아웃 처리
      this.logout();
    }
  }

  // 로그아웃 (모든 서비스)
  async logout() {
    try {
      // 모든 서비스에서 로그아웃 시도
      await Promise.allSettled([
        this.userService.logout(),
        // Post Service와 Comment Service는 별도 로그아웃이 없으므로 토큰만 제거
      ]);

      // 세션 스토리지 정리
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('backendAccessToken');
      sessionStorage.removeItem('idToken');
      sessionStorage.removeItem('refreshToken');

      return true;
    } catch (error) {
      console.error('로그아웃 오류:', error);
      return false;
    }
  }

  // API 응답 공통 처리
  async handleResponse(response, serviceName) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        statusText: response.statusText,
        message: errorData.message || `${serviceName} 요청 실패`,
        data: errorData
      };
    }
    return response.json();
  }

  // 재시도 로직
  async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        
        // 재시도 전 대기
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
}

export default new ApiService();
