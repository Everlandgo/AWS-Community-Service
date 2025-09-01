class PostService {
  constructor() {
    this.baseURL = process.env.REACT_APP_POST_SERVICE_URL || 'http://localhost:8082';
  }

  // 인증 헤더 생성
  getAuthHeaders() {
    // 공통 토큰 유틸리티 사용
    const { createAuthHeaders } = require('../utils/tokenUtils');
    return createAuthHeaders();
  }

  // 게시글 작성
  async createPost(postData) {
    try {
      const response = await fetch(`${this.baseURL}/posts`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        throw new Error(`게시글 작성 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('게시글 작성 오류:', error);
      throw error;
    }
  }

  // 게시글 목록 조회
  async getPosts(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.size) queryParams.append('size', params.size);
      if (params.category) queryParams.append('category', params.category);
      if (params.search) queryParams.append('search', params.search);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const url = `${this.baseURL}/posts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`게시글 목록 조회 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('게시글 목록 조회 오류:', error);
      throw error;
    }
  }

  // 게시글 상세 조회
  async getPost(postId) {
    try {
      const response = await fetch(`${this.baseURL}/posts/${postId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`게시글 조회 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('게시글 조회 오류:', error);
      throw error;
    }
  }

  // 게시글 수정
  async updatePost(postId, postData) {
    try {
      const response = await fetch(`${this.baseURL}/posts/${postId}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        throw new Error(`게시글 수정 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('게시글 수정 오류:', error);
      throw error;
    }
  }

  // 게시글 삭제
  async deletePost(postId) {
    try {
      const response = await fetch(`${this.baseURL}/posts/${postId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`게시글 삭제 실패: ${response.status}`);
      }

      return response.ok;
    } catch (error) {
      console.error('게시글 삭제 오류:', error);
      throw error;
    }
  }

  // 게시글 좋아요
  async likePost(postId) {
    try {
      const response = await fetch(`${this.baseURL}/posts/${postId}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ action: 'like' })
      });

      if (!response.ok) {
        throw new Error(`게시글 좋아요 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('게시글 좋아요 오류:', error);
      throw error;
    }
  }

  // 게시글 좋아요 취소
  async unlikePost(postId) {
    try {
      const response = await fetch(`${this.baseURL}/posts/${postId}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ action: 'unlike' })
      });

      if (!response.ok) {
        throw new Error(`게시글 좋아요 취소 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('게시글 좋아요 취소 오류:', error);
      throw error;
    }
  }

  // 내가 작성한 게시글 조회
  async getMyPosts(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.size) queryParams.append('size', params.size);

      const url = `${this.baseURL}/posts/my${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`내 게시글 조회 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('내 게시글 조회 오류:', error);
      throw error;
    }
  }
}

export default new PostService();
