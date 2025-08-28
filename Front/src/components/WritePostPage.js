// src/components/WritePostPage.js
import React, { Component } from 'react';
import { ArrowLeft, Save, X } from 'lucide-react';
import CommonLayout from './CommonLayout';

const decodeJwt = (t) => {
  try {
    const b64 = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(b64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(json);
  } catch {
    return {};
  }
};

class WritePostPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      title: '',
      content: '',
      category: '전체',
      isLoading: false,
      error: null,
    };
    this.categories = ['전체', '동물/반려동물', '여행', '건강/헬스', '연예인'];
  }

  handleInputChange = (field, value) => {
    this.setState({ [field]: value });
  };

  handleSubmit = async (e) => {
    e.preventDefault();

    if (!this.state.title.trim()) return alert('게시글 제목을 입력해주세요.');
    if (!this.state.content.trim()) return alert('게시글 내용을 입력해주세요.');
    if (this.state.content.trim().length < 5) return alert('게시글은 최소 5자 이상 입력해주세요.');

    this.setState({ isLoading: true, error: null });

    try {
      // 1) 토큰 확보 (AccessToken 우선 → 없으면 IdToken)
      const storedUser   = JSON.parse(localStorage.getItem('currentUser') || 'null');
      const storedTokens = JSON.parse(localStorage.getItem('cognitoTokens') || '{}');

      const accessTok =
        this.props.currentUser?.access_token ||
        storedTokens.accessToken || storedTokens.access_token ||
        storedUser?.access_token || null;

      const idTok =
        this.props.currentUser?.id_token ||
        storedTokens.idToken || storedTokens.id_token ||
        storedUser?.id_token || null;

      const bearer = accessTok || idTok;
      if (!bearer) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }

      // 2) 작성자명 결정
      const claims = decodeJwt(bearer);
      const authorName =
        this.props.currentUser?.profile?.name ||
        this.props.currentUser?.profile?.username ||
        storedUser?.profile?.name ||
        storedUser?.profile?.username ||
        claims.name ||
        claims['cognito:username'] ||
        storedUser?.username ||
        storedUser?.email ||
        'Anonymous';

      // 3) API 호출
      const base = process.env.REACT_APP_POST_SERVICE_URL || 'http://localhost:8081/api/v1';
      const res = await fetch(`${base}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearer}`,
        },
        body: JSON.stringify({
          title: this.state.title.trim(),
          content: this.state.content.trim(),
          category: this.state.category,
          author: authorName,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || `게시글 작성에 실패했습니다. (${res.status})`);
      }

      alert('게시글이 성공적으로 작성되었습니다!');
      this.props.navigate('/');
    } catch (err) {
      console.error('게시글 작성 오류:', err);
      this.setState({ error: err.message || '게시글 작성에 실패했습니다.' });
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
    const { isLoggedIn, currentUser } = this.props;
    const { title, content, category, isLoading, error } = this.state;

    if (!isLoggedIn) {
      return (
        <CommonLayout isLoggedIn={isLoggedIn} currentUser={currentUser} navigate={this.props.navigate}>
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted-foreground)' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--foreground)' }}>
              로그인이 필요합니다
            </h2>
            <p style={{ fontSize: '16px', marginBottom: '24px', lineHeight: '1.6' }}>
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
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.target.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.target.style.opacity = '1')}
            >
              로그인하기
            </button>
          </div>
        </CommonLayout>
      );
    }

    return (
      <CommonLayout isLoggedIn={isLoggedIn} currentUser={currentUser} navigate={this.props.navigate}>
        <div className="write-post-container">
          <div className="back-button-container">
            <button onClick={this.handleCancel} className="back-button">
              <ArrowLeft size={20} />
              뒤로가기
            </button>
          </div>

          <div className="write-post-header">
            <h1 className="write-post-title">새 게시글 작성</h1>
            <div className="write-post-actions">
              <button type="button" className="cancel-btn" onClick={this.handleCancel} disabled={isLoading}>
                <X size={16} />
                취소
              </button>
              <button type="submit" className="save-btn" onClick={this.handleSubmit} disabled={isLoading}>
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
            <div className="form-group">
              <label htmlFor="title" className="form-label">제목</label>
              <input
                type="text"
                id="title"
                className="form-input"
                value={title}
                onChange={(e) => this.handleInputChange('title', e.target.value)}
                placeholder="게시글 제목을 입력하세요"
                maxLength={100}
                required
              />
              <span className="char-count">{title.length}/100</span>
            </div>

            <div className="form-group">
              <label htmlFor="category" className="form-label">카테고리</label>
              <select
                id="category"
                className="form-select"
                value={category}
                onChange={(e) => this.handleInputChange('category', e.target.value)}
                required
              >
                {this.categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="content" className="form-label">내용</label>
              <textarea
                id="content"
                className="form-textarea"
                value={content}
                onChange={(e) => this.handleInputChange('content', e.target.value)}
                placeholder="게시글 내용을 입력하세요 (최소 5자)"
                rows={15}
                minLength={5}
                required
              />
              <span className="char-count">{content.length}자</span>
            </div>
          </form>
        </div>

        {/* CRA에서는 styled-jsx를 쓰지 않습니다 */}
        <style>{`
          .write-post-container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .back-button-container { margin-bottom: 20px; }
          .back-button { display:flex; align-items:center; gap:8px; padding:10px 16px; background:none; border:1px solid #e2e8f0; border-radius:6px; color:#64748b; cursor:pointer; transition:all .2s; font-size:14px; }
          .back-button:hover { background:#f8fafc; border-color:#cbd5e1; color:#475569; }
          .write-post-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:32px; padding-bottom:20px; border-bottom:1px solid #e2e8f0; }
          .write-post-title { font-size:28px; font-weight:700; color:#1e293b; margin:0; }
          .write-post-actions { display:flex; gap:12px; }
          .cancel-btn,.save-btn { display:flex; align-items:center; gap:8px; padding:10px 20px; border:none; border-radius:6px; font-size:14px; font-weight:500; cursor:pointer; transition:all .2s; }
          .cancel-btn { background:#f1f5f9; color:#64748b; border:1px solid #e2e8f0; }
          .cancel-btn:hover { background:#e2e8f0; border-color:#cbd5e1; }
          .save-btn { background:var(--primary); color:var(--primary-foreground); }
          .save-btn:hover { opacity:.9; }
          .save-btn:disabled { opacity:.6; cursor:not-allowed; }
          .error-message { background:#fef2f2; border:1px solid #fecaca; color:#dc2626; padding:12px 16px; border-radius:6px; margin-bottom:24px; }
          .form-group { margin-bottom:24px; }
          .form-label { display:block; font-weight:600; color:#374151; margin-bottom:8px; font-size:14px; }
          .form-input,.form-select,.form-textarea { width:100%; padding:12px 16px; border:1px solid #d1d5db; border-radius:6px; font-size:14px; transition:border-color .2s; }
          .form-input:focus,.form-select:focus,.form-textarea:focus { outline:none; border-color:var(--primary); box-shadow:0 0 0 3px rgba(59,130,246,.1); }
          .form-textarea { resize:vertical; min-height:200px; }
          .char-count { display:block; text-align:right; color:#6b7280; font-size:12px; margin-top:4px; }
        `}</style>
      </CommonLayout>
    );
  }
}

export default WritePostPage;
