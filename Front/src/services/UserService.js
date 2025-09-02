class UserService {
  constructor() {
    this.baseURL = process.env.REACT_APP_USER_SERVICE_URL || 'http://localhost:8081';
  }

  // 인증 헤더 생성
  getAuthHeaders() {
    // 공통 토큰 유틸리티 사용
    const { createAuthHeaders } = require('../utils/tokenUtils');
    return createAuthHeaders();
  }

  // 회원가입
  async register(userData) {
    try {
      const response = await fetch(`${this.baseURL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        throw new Error(`회원가입 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('회원가입 오류:', error);
      throw error;
    }
  }

  // 로그인 (백엔드 API 연동)
  async login(credentials) {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        // 서버에서 반환한 에러 메시지 추출
        let errorMessage = `로그인 실패: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData?.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          console.warn('에러 응답 파싱 실패:', parseError);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // 백엔드 토큰 저장
      if (data.accessToken) {
        sessionStorage.setItem('backendAccessToken', data.accessToken);
      }

      return data;
    } catch (error) {
      console.error('로그인 오류:', error);
      throw error;
    }
  }

  // 로그아웃
  async logout() {
    try {
      const response = await fetch(`${this.baseURL}/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });

      if (response.ok) {
        sessionStorage.removeItem('backendAccessToken');
      }

      return response.ok;
    } catch (error) {
      console.error('로그아웃 오류:', error);
      throw error;
    }
  }

  // 내 프로필 조회
  async getMyProfile() {
    try {
      const response = await fetch(`${this.baseURL}/users/me`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`프로필 조회 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('프로필 조회 오류:', error);
      throw error;
    }
  }

  // 프로필 업데이트
  async updateProfile(profileData) {
    try {
      const response = await fetch(`${this.baseURL}/users/me`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        throw new Error(`프로필 업데이트 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('프로필 업데이트 오류:', error);
      throw error;
    }
  }

  // 비밀번호 변경
  async changePassword(passwordData) {
    try {
      const response = await fetch(`${this.baseURL}/users/me`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(passwordData)
      });

      if (!response.ok) {
        throw new Error(`비밀번호 변경 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('비밀번호 변경 오류:', error);
      throw error;
    }
  }

  // 회원 탈퇴
  async deleteAccount() {
    try {
      const response = await fetch(`${this.baseURL}/users/me`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (response.ok) {
        sessionStorage.removeItem('backendAccessToken');
      }

      return response.ok;
    } catch (error) {
      console.error('회원 탈퇴 오류:', error);
      throw error;
    }
  }

  // 계정 비활성화(탈퇴)
  async deactivateAccount() {
    try {
      const url = `${this.baseURL}/api/v1/users/me/deactivate`;
      console.log('[Deactivate] request URL:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include'
      });

      if (response.ok) {
        sessionStorage.removeItem('backendAccessToken');
      }

      if (!response.ok) {
        // 서버가 상세 오류를 반환했다면 추출
        let message = `계정 비활성화 실패: ${response.status}`;
        try {
          const data = await response.json();
          if (data?.message) message = data.message;
        } catch (_) {}
        throw new Error(message);
      }

      return true;
    } catch (error) {
      // 네트워크/CORS/서버 다운 등 fetch 자체 실패 구분
      if (error?.name === 'TypeError') {
        console.error('계정 비활성화 네트워크 오류:', error);
        throw new Error('서버에 연결할 수 없습니다. 네트워크 또는 CORS 설정을 확인해주세요.');
      }
      console.error('계정 비활성화 오류:', error);
      throw error;
    }
  }
}

export default new UserService();
