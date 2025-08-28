import React, { Component } from 'react';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import CommonLayout from './CommonLayout';
import AuthService from '../services/AuthService'; // ← 핵심 변경

class LoginPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',           // 이메일 또는 사용자명
      password: '',
      showPassword: false,
      isLoading: false,
      error: null,
    };
  }

  handleInputChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value, error: null });
  };

  togglePasswordVisibility = () => {
    this.setState((prev) => ({ showPassword: !prev.showPassword }));
  };

    handleLogin = async (e) => {
    e.preventDefault();
    const { username, password } = this.state;

    if (!username || !password) {
      this.setState({ error: '사용자 이름(또는 이메일)과 비밀번호를 모두 입력해주세요.' });
      return;
    }

    this.setState({ isLoading: true, error: null });

    try {
      // Cognito 인증
      const u = await AuthService.login({ emailOrUsername: username, password });

      // App이 기대하는 키로 매핑
      const userData = {
        ...u,
        id_token: u.idToken,
        access_token: u.accessToken,
        refresh_token: u.refreshToken,
      };

     // ❶ 토큰을 표준(JSON) + 호환(개별 키) 모두 저장
     const tokens = {
       accessToken: userData.access_token,
       idToken: userData.id_token,
       refreshToken: userData.refresh_token,
     };
     localStorage.setItem('cognitoTokens', JSON.stringify(tokens));
     localStorage.setItem('accessToken', tokens.accessToken);
     localStorage.setItem('idToken', tokens.idToken);
     localStorage.setItem('refreshToken', tokens.refreshToken);

     // ❷ (선택) UI 복원용 currentUser도 저장
     const currentUser = {
       username: userData.profile?.username || userData.username || username,
       email: userData.email || (username.includes('@') ? username : ''),
       profile: userData.profile || { name: username, username },
     };
     localStorage.setItem('currentUser', JSON.stringify(currentUser));

      this.props.onLogin?.(userData);
      this.props.navigate?.('/');
    } catch (err) {
      const code = err?.code || err?.__type;
      const msgMap = {
        NotAuthorizedException: '사용자 이름 또는 비밀번호가 올바르지 않습니다.',
        UserNotConfirmedException: '계정이 확인되지 않았습니다. 이메일 인증 후 다시 시도해주세요.',
        PasswordResetRequiredException: '비밀번호 재설정이 필요합니다. "비밀번호 찾기"를 이용하세요.',
        UserNotFoundException: '존재하지 않는 사용자입니다.',
        NEW_PASSWORD_REQUIRED: '새 비밀번호가 필요합니다. 관리자에 문의하세요.',
      };
      this.setState({
        error: msgMap[code] || err?.message || '로그인에 실패했습니다.',
      });
    } finally {
      this.setState({ isLoading: false });
    }
  };


  render() {
    const { username, password, showPassword, isLoading, error } = this.state;

    return (
      <CommonLayout isLoggedIn={false} currentUser={null} navigate={this.props.navigate}>
        <div className="auth-page">
          <div className="auth-container">
            <div className="auth-header">
              <h1 className="auth-title">로그인</h1>
              <p className="auth-subtitle">계정에 로그인하여 커뮤니티를 이용하세요.</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form className="auth-form" onSubmit={this.handleLogin}>
              <div className="form-group">
                <label className="form-label">
                  <User size={16} />
                  사용자 이름(또는 이메일)
                </label>
                <input
                  type="text"
                  name="username"
                  value={username || ''}
                  onChange={this.handleInputChange}
                  className="form-input"
                  placeholder="사용자 이름 또는 이메일"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Lock size={16} />
                  비밀번호
                </label>
                <div className="password-input-container">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={password || ''}
                    onChange={this.handleInputChange}
                    className="form-input"
                    placeholder="비밀번호를 입력하세요"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={this.togglePasswordVisibility}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-button" disabled={isLoading}>
                {isLoading ? '로그인 중...' : '로그인'}
              </button>
            </form>

            <div className="auth-footer">
              <p>
                <button onClick={() => this.props.navigate('/signup')} className="auth-link">
                  회원가입하기
                </button>
              </p>
              <p>
                <button onClick={() => this.props.navigate('/forgot-password')} className="auth-link">
                  비밀번호 찾기
                </button>
              </p>
            </div>
          </div>
        </div>
      </CommonLayout>
    );
  }
}

export default LoginPage;
