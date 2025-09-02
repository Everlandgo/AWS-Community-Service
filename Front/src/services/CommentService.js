class CommentService {
  constructor() {
    this.baseURL = process.env.REACT_APP_COMMENT_SERVICE_URL || 'http://localhost:8083';
  }

  // 인증 헤더 생성
  getAuthHeaders() {
    try {
      const { createAuthHeaders, getCognitoToken } = require('../utils/tokenUtils');
      const token = getCognitoToken();
      if (!token) throw new Error('인증 토큰이 필요합니다.');
      const headers = createAuthHeaders();
      if (!headers.Authorization) {
        console.warn('CommentService: createAuthHeaders에서 Authorization 헤더를 생성할 수 없음');
        throw new Error('인증 토큰이 필요합니다.');
      }
      return headers;
    } catch (error) {
      console.warn('CommentService: tokenUtils 사용 실패, 직접 토큰 확인:', error.message);
      
      // 직접 sessionStorage에서 토큰 확인
      const savedTokens = sessionStorage.getItem('cognitoTokens');
      let accessToken = null;
      
      if (savedTokens) {
        try {
          const tokens = JSON.parse(savedTokens);
          // Cognito 토큰 키 우선 사용
          accessToken = tokens.access_token || tokens.id_token || tokens.accessToken || tokens.idToken;
          
          if (accessToken) {

            return {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            };
          }
        } catch (parseError) {
          console.error('CommentService: 토큰 파싱 실패:', parseError);
        }
      }
      
      // 토큰을 찾을 수 없는 경우
      console.error('CommentService: 인증 토큰을 찾을 수 없음');
      throw new Error('인증 토큰이 필요합니다. 다시 로그인해주세요.');
    }
  }

  // 댓글 작성
  async createComment(postId, commentData, accessToken = null) {
    try {
      // accessToken이 제공되지 않은 경우 자동으로 가져오기
      if (!accessToken) {
        const headers = this.getAuthHeaders();
        accessToken = headers.Authorization.replace('Bearer ', '');
      }
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      };
      
      const requestBody = JSON.stringify(commentData);
      const url = `${this.baseURL}/api/v1/posts/${postId}/comments`;
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: requestBody
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`댓글 작성 실패: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      throw error;
    }
  }

  // 댓글 목록 조회
  async getComments(postId, accessToken = null, params = {}) {
    try {
      // accessToken이 제공되지 않은 경우 자동으로 가져오기
      if (!accessToken) {
        const headers = this.getAuthHeaders();
        accessToken = headers.Authorization.replace('Bearer ', '');
      }
      
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.size) queryParams.append('size', params.size);
      if (params.sortBy) queryParams.append('sort_by', params.sortBy);
      if (params.sortOrder) queryParams.append('sort_order', params.sortOrder);

      const url = `${this.baseURL}/api/v1/posts/${postId}/comments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      };
      
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        throw new Error(`댓글 목록 조회 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('댓글 목록 조회 오류:', error);
      throw error;
    }
  }

  // 댓글 수정
  async updateComment(commentId, commentData, accessToken = null) {
    try {
      // accessToken이 제공되지 않은 경우 자동으로 가져오기
      if (!accessToken) {
        const headers = this.getAuthHeaders();
        accessToken = headers.Authorization.replace('Bearer ', '');
      }
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      };
      
      const response = await fetch(`${this.baseURL}/api/v1/comments/${commentId}`, {
        method: 'PATCH',
        headers: headers,
        body: JSON.stringify(commentData)
      });

      if (!response.ok) {
        throw new Error(`댓글 수정 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('댓글 수정 오류:', error);
      throw error;
    }
  }

  // 댓글 삭제
  async deleteComment(commentId, accessToken = null) {
    try {
      // accessToken이 제공되지 않은 경우 자동으로 가져오기
      if (!accessToken) {
        const headers = this.getAuthHeaders();
        accessToken = headers.Authorization.replace('Bearer ', '');
      }
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      };
      
      const response = await fetch(`${this.baseURL}/api/v1/comments/${commentId}`, {
        method: 'DELETE',
        headers: headers
      });

      if (!response.ok) {
        throw new Error(`댓글 삭제 실패: ${response.status}`);
      }

      return response.ok;
    } catch (error) {
      console.error('댓글 삭제 오류:', error);
      throw error;
    }
  }

  // 내 댓글 조회
  async getMyComments(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.size) queryParams.append('size', params.size);

      const url = `${this.baseURL}/api/v1/comments/my${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`내 댓글 조회 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('내 댓글 조회 오류:', error);
      throw error;
    }
  }

  // 댓글 좋아요
  async likeComment(commentId, accessToken = null) {
    try {
      // accessToken이 제공되지 않은 경우 자동으로 가져오기
      if (!accessToken) {
        const headers = this.getAuthHeaders();
        accessToken = headers.Authorization.replace('Bearer ', '');
      }
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      };
      
      const response = await fetch(`${this.baseURL}/api/v1/comments/${commentId}/like`, {
        method: 'POST',
        headers: headers
      });

      if (!response.ok) {
        throw new Error(`댓글 좋아요 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('댓글 좋아요 오류:', error);
      throw error;
    }
  }

  // 댓글 좋아요 취소 (토글 방식으로 변경)
  async unlikeComment(commentId, accessToken = null) {
    try {
      // 백엔드가 토글 방식이므로 likeComment와 동일하게 처리
      // accessToken이 제공되지 않은 경우 자동으로 가져오기
      if (!accessToken) {
        const headers = this.getAuthHeaders();
        accessToken = headers.Authorization.replace('Bearer ', '');
      }
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      };
      
      const response = await fetch(`${this.baseURL}/api/v1/comments/${commentId}/like`, {
        method: 'POST',
        headers: headers
      });

      if (!response.ok) {
        throw new Error(`댓글 좋아요 취소 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('댓글 좋아요 취소 오류:', error);
      throw error;
    }
  }

  // 댓글 좋아요 상태 확인 (새로 추가)
  async getCommentLikeStatus(commentId, accessToken = null) {
    try {
      // accessToken이 제공되지 않은 경우 자동으로 가져오기
      if (!accessToken) {
        const headers = this.getAuthHeaders();
        accessToken = headers.Authorization.replace('Bearer ', '');
      }
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      };
      
      const response = await fetch(`${this.baseURL}/api/v1/comments/${commentId}/like/status`, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        throw new Error(`댓글 좋아요 상태 확인 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('댓글 좋아요 상태 확인 오류:', error);
      throw error;
    }
  }

  // 댓글 신고 (백엔드에 구현되지 않음 - 제거)
  // async reportComment(commentId, reportData) { ... }
}

export default new CommentService();
