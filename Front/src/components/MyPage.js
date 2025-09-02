import React, { Component } from 'react';
import { User, Mail, Calendar, ArrowLeft, Edit, Trash2, Eye, Heart, MessageCircle } from 'lucide-react';
import CommonLayout from './CommonLayout';
import "../styles/MyPage.css"
import UserService from '../services/UserService';
import { decodeToken, getCognitoToken, clearExpiredTokens } from '../utils/tokenUtils';

class MyPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      userInfo: null,
      userPosts: [],
      isLoading: true,
      error: null
    };
  }

  componentDidMount() {
    // 사용자 정보 설정
    if (this.props.currentUser) {
      this.setState({ userInfo: this.props.currentUser });
    }
    // 사용자가 작성한 글 가져오기
    this.fetchUserPosts();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.currentUser !== this.props.currentUser) {
      this.setState({ userInfo: this.props.currentUser });
    }
  }

  // 사용자가 작성한 글 가져오기
  fetchUserPosts = async () => {
    try {
      const { currentUser } = this.props;
      if (!currentUser?.sub) {
        this.setState({ isLoading: false });
        return;
      }

      // JWT 토큰에서 실제 사용자 정보 추출
      const token = getCognitoToken();
      const tokenPayload = token ? decodeToken(token) : null;
      const actualSub = tokenPayload?.sub || currentUser.sub;
      
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // 백엔드에서 사용자가 작성한 글 가져오기
      const response = await fetch(`http://localhost:8081/api/v1/posts?user_id=${actualSub}`, {
        headers: headers
      });
      if (response.ok) {
        const data = await response.json();
        const posts = data.posts || data.data || [];
        this.setState({ 
          userPosts: posts,
          isLoading: false 
        });
      } else {
        throw new Error('게시글을 가져오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('사용자 게시글 로드 오류:', error);
      this.setState({ 
        error: error.message,
        isLoading: false 
      });
    }
  };

  handleBack = () => {
    this.props.navigate('/');
  };

  handleEditPost = (postId) => {
    this.props.navigate(`/write?edit=${postId}`);
  };

  handleDeletePost = async (postId) => {
    if (window.confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      try {
        const response = await fetch(`http://localhost:8081/api/v1/posts/${postId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          // 삭제 성공 시 목록에서 제거
          this.setState(prevState => ({
            userPosts: prevState.userPosts.filter(post => post.id !== postId)
          }));
          alert('게시글이 삭제되었습니다.');
        } else {
          throw new Error('게시글 삭제에 실패했습니다.');
        }
      } catch (error) {
        console.error('게시글 삭제 오류:', error);
        alert('게시글 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  // 계정 비활성화(탈퇴)
  handleDeactivateAccount = async () => {
    const confirmed = window.confirm('정말로 탈퇴하시겠습니까? 탈퇴 시 로그인이 불가합니다.');
    if (!confirmed) return;

    try {
      const ok = await UserService.deactivateAccount();
      if (!ok) throw new Error('탈퇴 요청이 실패했습니다.');

      // 세션 정리 및 로그인 페이지로 이동
      clearExpiredTokens();
      sessionStorage.removeItem('backendAccessToken');
      alert('탈퇴가 완료되었습니다. 이용해주셔서 감사합니다.');
      this.props.navigate('/login');
    } catch (error) {
      console.error('계정 비활성화 오류:', error);
      alert(error.message || '탈퇴 처리 중 오류가 발생했습니다.');
    }
  };

  render() {
    const { userInfo, userPosts, isLoading, error } = this.state;
    const { currentUser, isLoggedIn } = this.props;

    // 사용자 정보가 없으면 로딩 표시
    if (!userInfo && !currentUser) {
      return (
        <CommonLayout
          isLoggedIn={isLoggedIn}
          currentUser={currentUser}
          navigate={this.props.navigate}
          onCategoryChange={this.handleCategoryChange}
          onLogout={this.props.onLogout}
        >
          <div className="auth-page">
            <div className="auth-container">
              <div className="loading"></div>
              <p>사용자 정보를 불러오는 중...</p>
            </div>
          </div>
        </CommonLayout>
      );
    }

    const user = userInfo || currentUser;

    return (
      <CommonLayout
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        navigate={this.props.navigate}
        hideSidebar={true} 
        hideSearch={true}
        onLogout={this.props.onLogout}
      >
        <div className="mypage-container">
          {/* 뒤로가기 버튼을 제목 아래에 */}
          <div className="back-button-container">
            <button 
              onClick={this.handleBack}
              className="mypage-back-button"
            >
              <ArrowLeft size={20} />
              뒤로가기
            </button>
          </div>

          {/* 제목 먼저 가운데에 */}
          <div className="mypage-header">
            <h1 className="mypage-title">마이페이지</h1>
          </div>

          

          <div className="mypage-content">
            {/* 사용자 정보 섹션 */}
            <div className="user-info-section">
              <div className="user-profile-card">
                <div className="profile-image">
                  <div className="profile-avatar">
                    {user?.username?.charAt(0)?.toUpperCase() || 
                     user?.sub?.charAt(0)?.toUpperCase() || 
                     user?.email?.charAt(0)?.toUpperCase() || 
                     'U'}
                  </div>
                </div>
                
                <div className="profile-details">
                  <h2 className="profile-name">
                    {user?.username || user?.sub || '사용자'}
                  </h2>
                  <p className="profile-email">
                    {user?.email || '이메일 정보 없음'}
                  </p>
                </div>
              </div>
            </div>

            {/* 사용자가 작성한 글 섹션 */}
            <div className="user-posts-section">
              <h3 className="section-title">내가 작성한 글</h3>
              
              {isLoading ? (
                <div className="loading">로딩 중...</div>
              ) : error ? (
                <div className="error">오류: {error}</div>
              ) : userPosts.length === 0 ? (
                <div className="no-posts">작성한 게시글이 없습니다.</div>
              ) : (
                <div className="my-posts-table">
                  {/* 테이블 헤더 */}
                  <div className="my-table-header">
                      <div className="my-header-cell">카테고리</div>
                      <div className="my-header-cell">제목</div>
                      <div className="my-header-cell">작성날짜</div>
                      <div className="my-header-cell">조회수</div>
                      <div className="my-header-cell">좋아요</div>
                      <div className="my-header-cell">댓글</div>
                      <div className="my-header-cell">작업</div>
                  </div>

                  {/* 테이블 본문 */}
                  <div className="my-table-body">
                    {userPosts.map(post => (
                      <div key={post.id} className="my-table-row">
                        <div className="my-table-cell category-cell">
                          <span className="my-category-tag">{post.category || '미분류'}</span>
                        </div>
                        <div className="my-table-cell title-cell">
                          <span 
                            className="my-post-title clickable" 
                            onClick={() => this.props.navigate(`/post/${post.id}`)} // 게시글 상세 페이지로 이동 (추가됨)
                            title="게시글 보기"
                          >
                            {post.title}
                          </span>
                        </div>
                        <div className="my-table-cell date-cell">
                          {new Date(post.created_at).toLocaleDateString('ko-KR')}
                        </div>
                        <div className="my-table-cell views-cell">
                          {post.view_count || 0}
                        </div>
                        <div className="my-table-cell likes-cell">
                          {post.like_count || 0}
                        </div>
                        <div className="my-table-cell comments-cell">
                          {post.comment_count || 0}
                        </div>
                        <div className="my-table-cell actions-cell">
                          <div className="my-actions-cell">
                            <button 
                              className="action-btn edit"
                              onClick={() => this.handleEditPost(post.id)}
                              title="수정"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              className="action-btn delete"
                              onClick={() => this.handleDeletePost(post.id)}
                              title="삭제"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* 계정 탈퇴 섹션 */}
            <div className="delete-user-section" style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="delete-user-btn"
                onClick={this.handleDeactivateAccount}
                title="계정 비활성화"
              >
                계정 탈퇴
              </button>
            </div>
          </div>
        </div>
      </CommonLayout>
    );
  }
}

export default MyPage;
