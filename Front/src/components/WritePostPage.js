import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { User, ArrowLeft, Save, X } from 'lucide-react';
import CommonLayout from './CommonLayout';
import "../styles/WritePostPage.css"

class WritePostPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      title: "",
      content: "",
      category: "자유",
      isLoading: false,
      error: null
    };
    this.categories = ["자유", "동물/반려동물", "여행", "건강/헬스", "연예인"];
  }

  handleInputChange = (field, value) => {
    this.setState({ [field]: value });
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    
    // 입력 내용 검증
    if (!this.state.title.trim()) {
      alert("게시글 제목을 입력해주세요.");
      return;
    }

    if (!this.state.content.trim()) {
      alert("게시글 내용을 입력해주세요.");
      return;
    }

    if (this.state.content.trim().length < 5) {
      alert("게시글은 최소 5자 이상 입력해주세요.");
      return;
    }

    this.setState({ isLoading: true, error: null });
    
    try {
      // Cognito ID 토큰 가져오기
      const token = this.props.currentUser?.id_token;
      
      console.log('현재 사용자 정보:', this.props.currentUser);
      console.log('토큰 확인:', token);
      
      if (!token) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }

              const response = await fetch('http://localhost:8081/api/v1/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: this.state.title.trim(),
          content: this.state.content.trim(),
          author: this.props.currentUser?.profile?.name || this.props.currentUser?.profile?.username || "Anonymous",
          category: this.state.category
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '게시글 작성에 실패했습니다.');
      }

      const result = await response.json();
      if (result.success) {
        alert("게시글이 성공적으로 작성되었습니다!");
        this.props.navigate('/');
      } else {
        throw new Error(result.message || '게시글 작성에 실패했습니다.');
      }
    } catch (error) {
      console.error('게시글 작성 오류:', error);
      this.setState({ error: error.message });
    } finally {
      this.setState({ isLoading: false });
    }
  };

  handleCancel = () => {
    if (this.state.title.trim() || this.state.content.trim()) {
      if (window.confirm('작성 중인 내용이 있습니다. 정말로 취소하시겠습니까?')) {
        this.props.navigate('/');
      }
    } else {
      this.props.navigate('/');
    }
  };

  render() {
    const { isLoggedIn, currentUser, profileImage } = this.props;
    const { title, content, category, isLoading, error } = this.state;

    // 디버깅을 위한 로그
    console.log('WritePostPage 렌더링:', { isLoggedIn, currentUser });
    console.log('현재 사용자 토큰:', currentUser?.id_token);

    if (!isLoggedIn) {
      return (
        <CommonLayout
          isLoggedIn={isLoggedIn}
          currentUser={currentUser}
          navigate={this.props.navigate}
        >
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: 'var(--muted-foreground)'
          }}>
            <h2 style={{ 
              fontSize: '24px', 
              marginBottom: '16px',
              color: 'var(--foreground)'
            }}>
              로그인이 필요합니다
            </h2>
            <p style={{ 
              fontSize: '16px', 
              marginBottom: '24px',
              lineHeight: '1.6'
            }}>
              게시글을 작성하려면 먼저 로그인해주세요.
            </p>
            <button
              onClick={() => this.props.navigate('/login')}
              style={{
                padding: '12px 24px',
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
                border: 'none',
                borderRadius: 'var(--radius)',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = '1';
              }}
            >
              로그인하기
            </button>
          </div>
        </CommonLayout>
      );
    }

    return (
      <CommonLayout
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        navigate={this.props.navigate}
      >
        <div className="write-post-container">
          {/* 뒤로가기 버튼 */}
          <div className="back-button-container">
            <button
              onClick={this.handleCancel}
              className="back-button"
            >
              <ArrowLeft size={20} />
              뒤로가기
            </button>
          </div>

          <div className="write-post-header">
            <h1 className="write-post-title">새 게시글 작성</h1>
            <div className="write-post-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={this.handleCancel}
                disabled={isLoading}
              >
                <X size={16} />
                취소
              </button>
              <button
                type="submit"
                className="save-btn"
                onClick={this.handleSubmit}
                disabled={isLoading}
              >
                <Save size={16} />
                {isLoading ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <p>오류: {error}</p>
            </div>
          )}

          <form className="write-post-form" onSubmit={this.handleSubmit}>
            <div className="post-form-group">
              <label htmlFor="title" className="post-form-label">제목</label>
              <input
                type="text"
                id="title"
                className="write-form-input"
                value={title}
                onChange={(e) => this.handleInputChange('title', e.target.value)}
                placeholder="게시글 제목을 입력하세요"
                maxLength={100}
                required
              />
              <span className="post-char-count">{title.length}/100</span>
            </div>

            <div className="post-form-group">
              <label htmlFor="category" className="post-form-label">카테고리</label>
              <select
                id="category"
                className="post-form-select"
                value={category}
                onChange={(e) => this.handleInputChange('category', e.target.value)}
                required
              >
                {this.categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="post-form-group">
              <label htmlFor="content" className="post-form-label">내용</label>
              <textarea
                id="content"
                className="post-form-textarea"
                value={content}
                onChange={(e) => this.handleInputChange('content', e.target.value)}
                placeholder="게시글 내용을 입력하세요 (최소 5자)"
                rows={15}
                minLength={5}
                required
              />
              <span className="post-char-count">{content.length}자</span>
            </div>
          </form>
        </div>
      </CommonLayout>
    );
  }
}

export default WritePostPage;
