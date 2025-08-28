class CommentService {
  constructor() {
    this.baseURL = process.env.REACT_APP_COMMENT_SERVICE_URL || 'http://localhost:8083';
  }

  // 인증 헤더 생성
  getAuthHeaders() {
   const bag = JSON.parse(localStorage.getItem('cognitoTokens') || '{}');
   const access =
     localStorage.getItem('accessToken') ||
     bag.accessToken ||
     bag.idToken ||
     localStorage.getItem('idToken');
   return {
     'Content-Type': 'application/json',
     ...(access ? { Authorization: `Bearer ${access}` } : {}),
   };
}


  // 댓글 작성
  async createComment(postId, commentData) {
    try {
      const response = await fetch(`${this.baseURL}/posts/${postId}/comments`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(commentData)
      });

      if (!response.ok) {
        throw new Error(`댓글 작성 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('댓글 작성 오류:', error);
      throw error;
    }
  }

  // 댓글 목록 조회
  async getComments(postId, params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.size) queryParams.append('size', params.size);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const url = `${this.baseURL}/posts/${postId}/comments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
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
  async updateComment(commentId, commentData) {
    try {
      const response = await fetch(`${this.baseURL}/comments/${commentId}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
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
  async deleteComment(commentId) {
    try {
      const response = await fetch(`${this.baseURL}/comments/${commentId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
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

  // 내가 작성한 댓글 조회
  async getMyComments(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.size) queryParams.append('size', params.size);

      const url = `${this.baseURL}/comments/my${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
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
  async likeComment(commentId) {
    try {
      const response = await fetch(`${this.baseURL}/comments/${commentId}/like`, {
        method: 'POST',
        headers: this.getAuthHeaders()
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

  // 댓글 좋아요 취소
  async unlikeComment(commentId) {
    try {
      const response = await fetch(`${this.baseURL}/comments/${commentId}/unlike`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
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

  // 댓글 신고
  async reportComment(commentId, reportData) {
    try {
      const response = await fetch(`${this.baseURL}/comments/${commentId}/report`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(reportData)
      });

      if (!response.ok) {
        throw new Error(`댓글 신고 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('댓글 신고 오류:', error);
      throw error;
    }
  }
}

export default new CommentService();
