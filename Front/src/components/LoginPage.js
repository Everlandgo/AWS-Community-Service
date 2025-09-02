import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import CommonLayout from './CommonLayout';
import "../styles/LoginPage.css"
import { CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';
import { userPool } from '../aws-config';
import { logSessionEvent, decodeToken } from '../utils/tokenUtils';

class LoginPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: '',
      showPassword: false,
      isLoading: false,
      error: null
    };
  }

  componentDidMount() {
    // URL 파라미터에서 세션 만료 이유 확인
    const urlParams = new URLSearchParams(window.location.search);
    const reason = urlParams.get('reason');
    
    if (reason === 'session_expired') {
      this.setState({
        error: '세션이 만료되었습니다. 다시 로그인해주세요.'
      });
    }
  }

  handleInputChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value, error: null });
  };

  togglePasswordVisibility = () => {
    this.setState(prevState => ({ showPassword: !prevState.showPassword }));
  };

  handleLogin = async (e) => {
    e.preventDefault();
    
    const { username, password } = this.state;
    
    if (!username || !password) {
      this.setState({ error: '사용자 이름과 비밀번호를 모두 입력해주세요.' });
      return;
    }

    this.setState({ isLoading: true, error: null });

    try {
      // AWS Cognito SDK를 사용한 로그인
      const user = new CognitoUser({ Username: username, Pool: userPool });
      const authDetails = new AuthenticationDetails({ Username: username, Password: password });

      user.authenticateUser(authDetails, {
        onSuccess: (session) => {
          // 로그인 성공
          const idToken = session.getIdToken().getJwtToken();
          const accessToken = session.getAccessToken().getJwtToken();
          const refreshToken = session.getRefreshToken().getToken();
          
          // JWT 토큰에서 실제 사용자 정보 추출
          const tokenPayload = decodeToken(idToken);
          const actualSub = tokenPayload?.sub || 'cognito_user_' + Date.now();
          const actualEmail = tokenPayload?.email || (username.includes('@') ? username : `${username}@cognito.local`);
          const actualUsername = tokenPayload?.cognito_username || tokenPayload?.username || username;
          
          const userData = {
            username: actualUsername,
            sub: actualSub,
            email: actualEmail,
            access_token: accessToken,
            id_token: idToken,
            refresh_token: refreshToken,
            profile: {
              name: actualUsername,
              username: actualUsername
            }
          };
          
          // sessionStorage에 토큰 저장 (통일된 키 사용)
          const tokens = {
            id_token: userData.id_token,
            access_token: userData.access_token,
            refresh_token: userData.refresh_token,
          };
          
          sessionStorage.setItem('cognitoTokens', JSON.stringify(tokens));
          
          // 사용자 정보도 sessionStorage에 저장 (토큰 포함)
          const currentUser = {
            username: userData.username,
            sub: userData.sub,
            email: userData.email,
            profile: userData.profile,
            // 토큰 정보 추가 (통일된 키 사용)
            id_token: userData.id_token,
            access_token: userData.access_token,
            refresh_token: userData.refresh_token,
          };
          sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
          
          logSessionEvent('LOGIN_SUCCESS', { 
            username: userData.username, 
            storage: 'sessionStorage' 
          });
          
          console.log('Cognito 로그인 성공:', userData);
          this.props.onLogin(userData);
          this.props.navigate('/');
        },
        onFailure: (err) => {
          console.error('Cognito 로그인 오류:', err);
          
          const code = err?.code || err?.__type;
          const message = err?.message || '';
          
          // User is disabled 메시지가 포함된 경우 특별 처리
          if (code === 'NotAuthorizedException' && message.includes('User is disabled')) {
            this.setState({
              error: '탈퇴한 회원입니다.',
              isLoading: false
            });
            return;
          }
          
          const map = {
            NotAuthorizedException: '사용자 이름 또는 비밀번호가 올바르지 않습니다.',
            UserNotConfirmedException: '계정이 확인되지 않았습니다. 이메일을 확인해주세요.',
            UserNotFoundException: '존재하지 않는 사용자입니다.',
            PasswordResetRequiredException: '비밀번호 재설정이 필요합니다. "비밀번호 찾기"를 이용하세요.',
            NEW_PASSWORD_REQUIRED: '새 비밀번호가 필요합니다. 관리자에 문의하세요.',
            UserLambdaValidationException: '탈퇴한 회원입니다.',
            InvalidUserPoolConfigurationException: '탈퇴한 회원입니다.',
          };
          
          this.setState({
            error: map[code] || err?.message || '로그인에 실패했습니다.',
            isLoading: false
          });
        },
        newPasswordRequired: (userAttributes, requiredAttributes) => {
          this.setState({
            error: '새 비밀번호를 설정해야 합니다.',
            isLoading: false
          });
        }
      });
    } catch (error) {
      console.error('로그인 오류:', error);
      this.setState({ 
        error: '로그인 처리 중 오류가 발생했습니다.',
        isLoading: false 
      });
    }
  };

  render() {
    const { username, password, showPassword, isLoading, error } = this.state;

    return (
      <CommonLayout
        isLoggedIn={false}
        currentUser={null}
        navigate={this.props.navigate}
        hideSidebar={true} 
        hideSearch={true}
        onCategoryChange={this.handleCategoryChange}
      >
        <div className="auth-page">
          <div className="auth-container">
            <div className="auth-header">
              <h1 className="auth-title">로그인</h1>
              <p className="auth-subtitle">계정에 로그인하여 커뮤니티를 이용하세요.</p>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <form className="auth-form" onSubmit={this.handleLogin}>
              <div className="form-group">
                <label className="form-label">
                  ID
                </label>
                <div className='form-input-container'>
                  <input
                    type="text"
                    name="username"
                    value={username}
                    onChange={this.handleInputChange}
                    className="form-input"
                    placeholder="이메일을 입력하세요"
                    required
                  />
                  <p className='password-toggle'/>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Password
                </label>
                <div className="form-input-container">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={password}
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

              <button 
                type="submit"
                className="auth-button" 
                disabled={isLoading}
              >
                {isLoading ? '로그인 중...' : '로그인'}
              </button>
            </form>

            <div className="auth-footer">
              <p>
                계정이 없으신가요?{' '}
                <button
                  onClick={() => this.props.navigate('/signup')}
                  className="auth-link"
                >
                  회원가입하기
                </button>
              </p>
              <p>
                <button 
                  onClick={() => this.props.navigate('/forgot-password')} 
                  className="auth-link"
                >
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
