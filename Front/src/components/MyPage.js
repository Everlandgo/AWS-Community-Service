import React, { Component } from 'react';
import { User, Mail, Calendar, ArrowLeft, Edit, Trash2, Eye, Heart, MessageCircle } from 'lucide-react';
import CommonLayout from './CommonLayout';

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

      // 백엔드에서 사용자가 작성한 글 가져오기
              const response = await fetch(`http://localhost:8081/api/v1/posts?author_id=${currentUser.sub}`);
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
        hideSidebar={true} // 마이페이지에서만 사이드바 숨기기
      >
        <div className="mypage-container">
          {/* 제목 먼저 가운데에 */}
          <div className="mypage-header">
            <h1 className="mypage-title">마이페이지</h1>
          </div>

          {/* 뒤로가기 버튼을 제목 아래에 */}
          <div className="back-button-container">
            <button 
              onClick={this.handleBack}
              className="back-button"
            >
              <ArrowLeft size={20} />
              뒤로가기
            </button>
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
                <div className="posts-table">
                  {/* 테이블 헤더 */}
                  <div className="table-header">
                    <div className="header-row">
                      <div className="header-cell category-cell">카테고리</div>
                      <div className="header-cell title-cell">제목</div>
                      <div className="header-cell date-cell">작성날짜</div>
                      <div className="header-cell views-cell">조회수</div>
                      <div className="header-cell likes-cell">좋아요</div>
                      <div className="header-cell comments-cell">댓글</div>
                      <div className="header-cell actions-cell">작업</div>
                    </div>
                  </div>

                  {/* 테이블 본문 */}
                  <div className="table-body">
                    {userPosts.map(post => (
                      <div key={post.id} className="table-row">
                        <div className="table-cell category-cell">
                          <span className="category-tag">{post.category || '미분류'}</span>
                        </div>
                        <div className="table-cell title-cell">
                          <span className="post-title">{post.title}</span>
                        </div>
                        <div className="table-cell date-cell">
                          {new Date(post.created_at).toLocaleDateString('ko-KR')}
                        </div>
                        <div className="table-cell views-cell">
                          <Eye size={16} />
                          {post.view_count || 0}
                        </div>
                        <div className="table-cell likes-cell">
                          <Heart size={16} />
                          {post.like_count || 0}
                        </div>
                        <div className="table-cell comments-cell">
                          <MessageCircle size={16} />
                          {post.comment_count || 0}
                        </div>
                        <div className="table-cell actions-cell">
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
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <style jsx>{`
            .mypage-container {
              padding: 20px;
              max-width: 1200px;
              margin: 0 auto;
            }

            .back-button-container {
              margin-bottom: 20px;
            }

            .back-button {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 10px 16px;
              background: none;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              color: #64748b;
              cursor: pointer;
              transition: all 0.2s;
              font-size: 14px;
            }

            .back-button:hover {
              background: #f8fafc;
              border-color: #cbd5e1;
              color: #475569;
            }

            .mypage-header {
              text-align: center;
              margin-bottom: 20px;
            }

            .mypage-title {
              font-size: 28px;
              font-weight: 700;
              color: #1e293b;
              margin: 0;
            }

            .user-info-section {
              margin-bottom: 32px;
            }

            .user-profile-card {
              background: #f8f9fa;
              border-radius: 12px;
              padding: 24px;
              display: flex;
              align-items: center;
              gap: 20px;
              border: 1px solid #e9ecef;
            }

            .profile-image {
              width: 80px;
              height: 80px;
              border-radius: 50%;
              overflow: hidden;
            }

            .profile-avatar {
              width: 100%;
              height: 100%;
              background: var(--primary);
              color: var(--primary-foreground);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 32px;
              font-weight: 700;
            }

            .profile-details h2 {
              margin: 0 0 8px 0;
              font-size: 24px;
              font-weight: 600;
              color: #1e293b;
            }

            .profile-email {
              margin: 0;
              color: #64748b;
              font-size: 16px;
            }

            .section-title {
              font-size: 20px;
              font-weight: 600;
              color: #1e293b;
              margin: 0 0 20px 0;
            }

            .posts-table {
              background: white;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
              overflow: hidden;
            }

            .table-header {
              background: #f8fafc;
              border-bottom: 1px solid #e2e8f0;
            }

            .header-row {
              display: grid;
              grid-template-columns: 120px 1fr 120px 80px 80px 80px 100px;
              gap: 16px;
              padding: 16px;
              font-weight: 600;
              color: #475569;
              font-size: 14px;
            }

            .table-body {
              background: white;
            }

            .table-row {
              display: grid;
              grid-template-columns: 120px 1fr 120px 80px 80px 80px 100px;
              gap: 16px;
              padding: 16px;
              border-bottom: 1px solid #f1f5f9;
              align-items: center;
            }

            .table-row:hover {
              background: #f8fafc;
            }

            .table-cell {
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .category-tag {
              background: var(--primary);
              color: var(--primary-foreground);
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 500;
            }

            .post-title {
              font-weight: 500;
              color: #1e293b;
            }

            .action-btn {
              padding: 6px;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              transition: all 0.2s;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .action-btn.edit {
              background: #dbeafe;
              color: #1d4ed8;
              margin-right: 8px;
            }

            .action-btn.edit:hover {
              background: #bfdbfe;
            }

            .action-btn.delete {
              background: #fee2e2;
              color: #dc2626;
            }

            .action-btn.delete:hover {
              background: #fecaca;
            }

            .loading, .error, .no-posts {
              text-align: center;
              padding: 60px 20px;
              font-size: 16px;
              color: #64748b;
            }

            .error {
              color: #ef4444;
            }
          `}</style>
        </div>
      </CommonLayout>
    );
  }
}

export default MyPage;
