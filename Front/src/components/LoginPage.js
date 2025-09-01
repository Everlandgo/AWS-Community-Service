import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import CommonLayout from './CommonLayout';
import "../styles/LoginPage.css"

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

  handleInputChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value });
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
      // AWS Cognito와 직접 연결하여 로그인
      const cognitoResponse = await fetch('https://cognito-idp.ap-northeast-2.amazonaws.com/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth'
        },
        body: JSON.stringify({
          ClientId: '2v16jp80jce0c40neuuhtlgg8t',
          UserPoolId: 'ap-northeast-2_nneGIIVuJ',
          AuthFlow: 'USER_PASSWORD_AUTH',
          AuthParameters: {
            USERNAME: username,
            PASSWORD: password
          }
        })
      });

      if (cognitoResponse.ok) {
        const result = await cognitoResponse.json();
        
        if (result.AuthenticationResult) {
          // 로그인 성공
          const userData = {
            username: username,
            sub: result.AuthenticationResult.AccessToken ? 'cognito_user_' + Date.now() : username,
            email: username.includes('@') ? username : `${username}@cognito.local`,
            accessToken: result.AuthenticationResult.AccessToken,
            id_token: result.AuthenticationResult.IdToken, // WritePostPage와 일치하도록 수정
            refreshToken: result.AuthenticationResult.RefreshToken,
            profile: {
              name: username,
              username: username
            }
          };
          
          console.log('Cognito 로그인 성공:', userData);
          this.props.onLogin(userData);
          this.props.navigate('/');
        } else if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
          this.setState({ error: '새 비밀번호를 설정해야 합니다.' });
        } else if (result.ChallengeName === 'SMS_MFA') {
          this.setState({ error: 'SMS 인증이 필요합니다.' });
        } else {
          this.setState({ error: '로그인에 실패했습니다.' });
        }
      } else {
        const errorData = await cognitoResponse.json();
        console.error('Cognito 로그인 오류:', errorData);
        
        if (errorData.__type === 'NotAuthorizedException') {
          this.setState({ error: '사용자 이름 또는 비밀번호가 올바르지 않습니다.' });
        } else if (errorData.__type === 'UserNotConfirmedException') {
          this.setState({ error: '계정이 확인되지 않았습니다. 이메일을 확인해주세요.' });
        } else if (errorData.__type === 'UserNotFoundException') {
          this.setState({ error: '존재하지 않는 사용자입니다.' });
        } else {
          this.setState({ error: `로그인 오류: ${errorData.message || '알 수 없는 오류'}` });
        }
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      this.setState({ error: '네트워크 오류가 발생했습니다.' });
    } finally {
      this.setState({ isLoading: false });
    }
  };

  render() {
    const { username, password, showPassword, isLoading, error } = this.state;

    return (
      <CommonLayout
        isLoggedIn={false}
        currentUser={null}
        navigate={this.props.navigate}
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
                  Email
                </label>
                <input
                  type="text"
                  name="username"
                  value={username}
                  onChange={this.handleInputChange}
                  className="form-input"
                  placeholder="이메일을 입력하세요"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  PWD
                </label>
                <div className="password-input-container">
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
            </div>
          </div>
        </div>
      </CommonLayout>
    );
  }
}

export default LoginPage;
