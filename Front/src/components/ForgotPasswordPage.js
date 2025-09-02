import React, { Component } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, User as UserIcon } from 'lucide-react';
import CommonLayout from './CommonLayout';
import { CognitoUser } from 'amazon-cognito-identity-js';
import { userPool } from '../aws-config';

class ForgotPasswordPage extends Component {
  constructor(props) {
          super(props);
      this.state = {
        // 1단계 입력(username + 이메일)
        username: '',
        email: '',
 
        // 2단계 입력
        confirmationCode: '',
        newPassword: '',
        confirmPassword: '',        
        showNewPassword: false,
        showConfirmPassword: false,
 
        // 내부 상태
        usernameForCognito: '',           // ← 입력한 username을 저장
        currentStep: 1,                   // 1: 코드요청, 2: 비번변경
        isLoading: false,
        error: null,
        success: null,
      };
  }

  // ===== 유틸 =====
  handleInputChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value, error: null, success: null });
  };

  togglePasswordVisibility = (field) =>
    this.setState((prev) => ({ [field]: !prev[field] }));

  validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  validatePassword = (password) => {
    const minLength = 8;
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
    return password.length >= minLength && hasLowerCase && hasNumbers && hasSpecialChar;
  };

  /**
   * (선택) 백엔드에서 username+email 매핑 검증 API가 있을 경우 사용
   * .env: REACT_APP_USERNAME_EMAIL_VERIFY_URL (POST, body: { username, email })
   * 응답 예: { "valid": true }
   */
  verifyUsernameEmail = async (username, email) => {
    const base = process.env.REACT_APP_USERNAME_EMAIL_VERIFY_URL;
    if (!base) return true; // 백엔드 검증이 없으면 프론트만으로 진행
    try {
      const res = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email })
      });
      if (!res.ok) return false;
      const data = await res.json().catch(() => ({}));
      return data?.valid !== false;
    } catch {
      return false;
    }
  };

  // ===== 1단계: 인증코드 발송 =====
  requestResetCode = async (e) => {
    e.preventDefault();
    const { username, email } = this.state;

    if (!username) return this.setState({ error: '사용자명을 입력해주세요.' });
    if (!email) return this.setState({ error: '이메일을 입력해주세요.' });
    if (!this.validateEmail(email)) return this.setState({ error: '유효한 이메일 형식을 입력해주세요.' });

    // 디버깅을 위한 로깅 추가
    console.log('비밀번호 재설정 요청 시작:', {
      username,
      email,
      userPool: userPool.getUserPoolId(),
      clientId: userPool.getClientId()
    });

    this.setState({ isLoading: true, error: null, success: null });

    try {
      // (선택) 서버에서 username+email 매핑 검증
      const verified = await this.verifyUsernameEmail(username, email);
      if (!verified) {
        this.setState({ isLoading: false, error: '입력한 사용자명과 이메일이 일치하지 않습니다.' });
        return;
      }

      // 2) Cognito forgotPassword 호출
      const user = new CognitoUser({ Username: username, Pool: userPool });
      user.forgotPassword({
        onSuccess: () => {
          this.setState({
            isLoading: false,
            currentStep: 2,
            success: '인증 코드가 등록된 이메일로 발송되었습니다.',
            usernameForCognito: username,
          });
        },
        onFailure: (err) => {
          console.error('forgotPassword error', err);
          
          // 더 자세한 에러 로깅 추가
          console.log('Error details:', {
            code: err?.code,
            name: err?.name,
            message: err?.message,
            stack: err?.stack
          });
          
          const map = {
            UserNotFoundException: '해당 사용자명을 찾을 수 없습니다.',
            CodeDeliveryFailureException: '이메일 발송에 실패했습니다. Cognito 설정을 확인하세요.',
            LimitExceededException: '요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.',
            InvalidParameterException: '연락처(이메일)가 등록/검증되어 있지 않습니다.',
            NotAuthorizedException: '계정이 확인되지 않았습니다. 이메일 인증 후 다시 시도하세요.',
          };
          
          const msg = map[err?.code] || err?.message || '코드 발송에 실패했습니다.';
          this.setState({ isLoading: false, error: msg });
        },
        inputVerificationCode: () => {
          this.setState({
            isLoading: false,
            currentStep: 2,
            usernameForCognito: username,
          });
        },
      });
    } catch (e1) {
      console.error(e1);
      this.setState({ isLoading: false, error: '요청 처리 중 오류가 발생했습니다.' });
    }
  };

  // ===== 2단계: 코드 + 새 비밀번호 확정 =====
  confirmNewPassword = async (e) => {
    e.preventDefault();
    const { confirmationCode, newPassword, confirmPassword, usernameForCognito } = this.state;

    if (!confirmationCode || !newPassword || !confirmPassword)
      return this.setState({ error: '코드와 새 비밀번호를 모두 입력해주세요.' });

    if (newPassword !== confirmPassword)
      return this.setState({ error: '비밀번호가 일치하지 않습니다.' });

    if (!this.validatePassword(newPassword))
      return this.setState({
        error: '비밀번호는 최소 8자 이상이며, 소문자, 숫자, 특수문자를 포함해야 합니다.',
      });

    // 1단계에서 저장해둔 usernameForCognito 사용 (백엔드 조회 결과 또는 이메일 그대로)
    const username = usernameForCognito;
    const user = new CognitoUser({ Username: username, Pool: userPool });

    this.setState({ isLoading: true, error: null, success: null });
    user.confirmPassword(confirmationCode, newPassword, {
      onSuccess: () => {
        this.setState({ isLoading: false, success: '비밀번호가 변경되었습니다. 로그인해주세요.' });
        this.props.navigate('/login');
      },
      onFailure: (err) => {
        console.error('confirmPassword error', err);
        
        // 더 자세한 에러 로깅 추가
        console.log('confirmPassword error details:', {
          code: err?.code,
          name: err?.name,
          message: err?.message,
          stack: err?.stack
        });
        
        const map = {
          ExpiredCodeException: '인증 코드가 만료되었습니다. 코드를 다시 요청하세요.',
          CodeMismatchException: '인증 코드가 일치하지 않습니다. 다시 확인해주세요.',
          InvalidPasswordException: '비밀번호가 Cognito 정책에 맞지 않습니다. 조건을 확인해주세요.',
          LimitExceededException: '요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.',
        };
        
        const msg = map[err?.code] || err?.message || '비밀번호 변경에 실패했습니다.';
        this.setState({ isLoading: false, error: msg });
      },
    });
  };

  // ===== 기타 =====
  goBackToStep1 = () => {
    this.setState({
      currentStep: 1,
      username: '',
      confirmationCode: '',
      newPassword: '',
      confirmPassword: '',
      error: null,
      success: null,
    });
  };

  // ===== UI =====
  renderStep1() {
    const { username, email, isLoading, error } = this.state;

    return (
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="auth-title">비밀번호 찾기</h1>
          <p className="auth-subtitle">아이디와 이메일을 입력해주세요요.</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form className="auth-form" onSubmit={this.requestResetCode}>
          <div className="form-group">
            <label className="form-label">
              <UserIcon size={16} />
              ID
            </label>
            <input
              type="text"
              name="username"
              value={username}
              onChange={this.handleInputChange}
              className="form-input"
              placeholder="ID"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              이메일 주소
            </label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={this.handleInputChange}
              className="form-input"
              placeholder="example@email.com"
              required
            />
          </div>

          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? '전송 중...' : '인증 코드 받기'}
          </button>
        </form>

        <div className="auth-footer">
          <button onClick={() => this.props.navigate('/login')} className="auth-link">
            <ArrowLeft size={16} /> 로그인
          </button>
        </div>
      </div>
    );
  }

  renderStep2() {
    const {
      confirmationCode,
      newPassword,
      confirmPassword,
      showNewPassword,
      showConfirmPassword,
      isLoading,
      error,
      success,
    } = this.state;

    return (
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="auth-title">새 비밀번호 설정</h1>
          <p className="auth-subtitle">{email}으로 전송된 인증 코드를 입력하고 <br/>새 비밀번호를 설정하세요.</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form className="auth-form" onSubmit={this.confirmNewPassword}>
          <div className="form-group">
            <label className="form-label">인증 코드</label>
            <input
              type="text"
              name="confirmationCode"
              value={confirmationCode}
              onChange={this.handleInputChange}
              className="form-input"
              placeholder="6자리 인증 코드를 입력하세요"
              maxLength="6"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              새 비밀번호
            </label>
            <div className="form-input-container">
              <input
                type={showNewPassword ? 'text' : 'password'}
                name="newPassword"
                value={newPassword}
                onChange={this.handleInputChange}
                className="form-input"
                placeholder="새 비밀번호를 입력하세요"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => this.togglePasswordVisibility('showNewPassword')}
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <small className="form-help">최소 8자 이상, 소문자, 숫자, 특수문자 포함</small>
          </div>

          <div className="form-group">
            <label className="form-label">
              새 비밀번호 확인
            </label>
            <div className="form-input-container">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={confirmPassword}
                onChange={this.handleInputChange}
                className="form-input"
                placeholder="새 비밀번호를 다시 입력하세요"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => this.togglePasswordVisibility('showConfirmPassword')}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>

        <div className="auth-footer">
          <button onClick={this.goBackToStep1} className="auth-link">
            <ArrowLeft size={16} />
            이메일 다시 입력하기
          </button>
        </div>
      </div>
    );
  }

  render() {
    return (
      <CommonLayout 
        isLoggedIn={false} 
        currentUser={null} 
        navigate={this.props.navigate}
        hideSidebar={true} 
        hideSearch={true}
      >
        <div className="auth-page">
          {this.state.currentStep === 1 ? this.renderStep1() : this.renderStep2()}
        </div>
      </CommonLayout>
    );
  }
}

export default ForgotPasswordPage;
