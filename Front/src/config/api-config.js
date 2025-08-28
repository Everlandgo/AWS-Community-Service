// MSA API 서비스 설정
export const API_CONFIG = {
  // User Service
  USER_SERVICE: {
    BASE_URL: process.env.REACT_APP_USER_SERVICE_URL || 'http://localhost:8081',
    ENDPOINTS: {
      REGISTER: '/auth/register',
      LOGIN: '/auth/login',
      LOGOUT: '/auth/logout',
      PROFILE: '/users/me',
      HEALTH: '/health'
    }
  },

  // Post Service
  POST_SERVICE: {
    BASE_URL: process.env.REACT_APP_POST_SERVICE_URL || 'http://localhost:8082',
    ENDPOINTS: {
      POSTS: '/posts',
      POST_DETAIL: '/posts/{postId}',
      MY_POSTS: '/posts/my',
      HEALTH: '/health'
    }
  },

  // Comment Service
  COMMENT_SERVICE: {
    BASE_URL: process.env.REACT_APP_COMMENT_SERVICE_URL || 'http://localhost:8083',
    ENDPOINTS: {
      COMMENTS: '/posts/{postId}/comments',
      COMMENT_DETAIL: '/comments/{commentId}',
      MY_COMMENTS: '/comments/my',
      HEALTH: '/health'
    }
  },

  // 공통 설정
  COMMON: {
    TIMEOUT: 10000, // 10초
    RETRY_COUNT: 3,
    RETRY_DELAY: 1000, // 1초
    HEADERS: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }
};

// 환경별 설정
export const getApiConfig = (environment = 'development') => {
  const configs = {
    development: {
      USER_SERVICE_URL: 'http://localhost:8081',
      POST_SERVICE_URL: 'http://localhost:8082',
      COMMENT_SERVICE_URL: 'http://localhost:8083'
    },
    staging: {
      USER_SERVICE_URL: 'https://user-service-staging.example.com',
      POST_SERVICE_URL: 'https://post-service-staging.example.com',
      COMMENT_SERVICE_URL: 'https://comment-service-staging.example.com'
    },
    production: {
      USER_SERVICE_URL: 'https://user-service.example.com',
      POST_SERVICE_URL: 'https://post-service.example.com',
      COMMENT_SERVICE_URL: 'https://comment-service.example.com'
    }
  };

  return configs[environment] || configs.development;
};

// API URL 생성 헬퍼 함수
export const buildApiUrl = (service, endpoint, params = {}) => {
  let url = `${service.BASE_URL}${endpoint}`;
  
  // URL 파라미터 치환
  Object.keys(params).forEach(key => {
    url = url.replace(`{${key}}`, params[key]);
  });
  
  return url;
};

// 에러 코드별 메시지
export const ERROR_MESSAGES = {
  400: '잘못된 요청입니다.',
  401: '인증이 필요합니다.',
  403: '접근 권한이 없습니다.',
  404: '요청한 리소스를 찾을 수 없습니다.',
  409: '이미 존재하는 리소스입니다.',
  422: '입력 데이터가 유효하지 않습니다.',
  500: '서버 오류가 발생했습니다.',
  502: '서비스에 연결할 수 없습니다.',
  503: '서비스가 일시적으로 사용할 수 없습니다.',
  504: '요청 시간이 초과되었습니다.'
};

// HTTP 상태 코드별 재시도 여부
export const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];
