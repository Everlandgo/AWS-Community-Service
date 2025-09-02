// src/components/SignupPage.js
import React, { Component } from 'react';
import { Mail, User, Lock, Eye, EyeOff, ArrowLeft, RefreshCw } from 'lucide-react';
import CommonLayout from './CommonLayout';
import { CognitoUserPool, CognitoUser, CognitoUserAttribute } from 'amazon-cognito-identity-js';
import { userPool } from '../aws-config';

class SignupPage extends Component {
  state = {
    // 1단계
    email: '',
    username: '',           // 이메일을 아이디로 쓸 거면 email을 그대로 복사해도 됨
    password: '',
    confirmPassword: '',
    showPassword: false,
    showConfirmPassword: false,

    // 2단계
    confirmationCode: '',

    // 상태
    isLoading: false,
    currentStep: 1,         // 1: 회원정보 입력, 2: 코드 확인
    error: null,
    success: null,

    // 내부 저장
    usernameForCognito: '', // 실제 확인에 사용할 Username (email을 쓰거나, 별도의 username을 쓴다면 그 값)
  };

  // ===== 유틸 =====
  handleChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value, error: null, success: null });
  };

  toggle = (field) => this.setState((s) => ({ [field]: !s[field] }));

  validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  // 비밀번호 정책: 최소 8자, 소문자/숫자/특수문자 포함
  validatePassword = (password) => {
    const hasLower = /[a-z]/.test(password);
    const hasNum   = /\d/.test(password);
    const hasSpec  = /[^A-Za-z0-9]/.test(password);
    return password.length >= 8 && hasLower && hasNum && hasSpec;
  };

  // ===== 1단계: 회원가입 제출 =====
  handleSignup = (e) => {
    e.preventDefault();
    const { email, username, password, confirmPassword } = this.state;

    if (!email || !username || !password || !confirmPassword) {
      return this.setState({ error: '모든 필드를 입력해주세요.' });
    }
    if (!this.validateEmail(email)) {
      return this.setState({ error: '유효한 이메일 주소를 입력해주세요.' });
    }
    if (password !== confirmPassword) {
      return this.setState({ error: '비밀번호가 일치하지 않습니다.' });
    }
    if (!this.validatePassword(password)) {
      return this.setState({
        error: '비밀번호는 최소 8자, 소문자/숫자/특수문자를 포함해야 합니다.'
      });
    }

    this.setState({ isLoading: true, error: null, success: null });

    // Cognito 속성 세팅
    const attributes = [
      new CognitoUserAttribute({ Name: 'email', Value: email }),
      // 필요시: new CognitoUserAttribute({ Name: 'name', Value: username }),
    ];

    // 회원가입
    userPool.signUp(username, password, attributes, null, (err, result) => {
      if (err) {
        const code = err?.code;
        const map = {
          InvalidPasswordException: '비밀번호 정책에 맞지 않습니다.',
          UsernameExistsException: '이미 존재하는 사용자명입니다.',
          InvalidParameterException: '입력값이 올바르지 않습니다.',
        };
        return this.setState({
          isLoading: false,
          error: map[code] || err.message || '회원가입에 실패했습니다.',
        });
      }

      // 가입 성공 → 코드 확인 단계로
      const cognitoUsername = result?.user?.getUsername?.() || username;
      this.setState({
        isLoading: false,
        currentStep: 2,
        success: '이메일을 확인해주세요.',
        usernameForCognito: cognitoUsername,
      });
    });
  };

  // 코드 재발송
  resendCode = () => {
    const { usernameForCognito, email, username } = this.state;
    const u = usernameForCognito || username || email;
    if (!u) return this.setState({ error: '사용자명을 확인할 수 없습니다.' });

    const user = new CognitoUser({ Username: u, Pool: userPool });
    this.setState({ isLoading: true, error: null, success: null });
    user.resendConfirmationCode((err, res) => {
      if (err) {
        const msg = err?.message || '코드 재발송에 실패했습니다.';
        return this.setState({ isLoading: false, error: msg });
      }
      this.setState({
        isLoading: false,
        success: '인증 코드를 다시 전송했습니다. 메일함을 확인하세요.',
      });
    });
  };

  // ===== 2단계: 코드 확인(이메일 인증) =====
  confirmSignUp = (e) => {
    e.preventDefault();
    const { confirmationCode, usernameForCognito, email, username } = this.state;

    if (!confirmationCode) {
      return this.setState({ error: '인증 코드를 입력해주세요.' });
    }

    const u = usernameForCognito || username || email;
    const user = new CognitoUser({ Username: u, Pool: userPool });

    this.setState({ isLoading: true, error: null, success: null });

    // amazon-cognito-identity-js: confirmRegistration(code, forceAliasCreation, cb)
    user.confirmRegistration(confirmationCode, true, (err, result) => {
      if (err) {
        const code = err?.code;
        const map = {
          CodeMismatchException: '인증 코드가 올바르지 않습니다.',
          ExpiredCodeException: '인증 코드가 만료되었습니다. 다시 요청하세요.',
        };
        return this.setState({
          isLoading: false,
          error: map[code] || err.message || '인증에 실패했습니다.',
        });
      }

      // 인증 성공 → 로그인 페이지로 이동
      this.setState({ isLoading: false, success: '이메일 인증이 완료되었습니다. 로그인해주세요.' });
      this.props.navigate('/login');
    });
  };

  // ===== 화면 =====
  renderStep1() {
    const { email, username, password, confirmPassword, showPassword, showConfirmPassword, isLoading, error } = this.state;

    return (
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="auth-title">회원가입</h1>
          <p className="auth-subtitle">아래 정보를 입력하고, 이메일 인증을 완료해주세요.</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form className="auth-form" onSubmit={this.handleSignup}>
          <div className="form-group">
            <label className="form-label">이메일</label>
            <div className="form-input-container">
              <input
                type="email"
                name="email"
                value={email}
                onChange={this.handleChange}
                className="form-input"
                placeholder="you@example.com"
                required
              />
              <p className='password-toggle'/>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">사용자명</label>
            <div className="form-input-container">
              <input
                type="text"
                name="username"
                value={username}
                onChange={this.handleChange}
                className="form-input"
                placeholder="닉네임"
                required
              />
              <p className='password-toggle'/>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">비밀번호</label>
            <div className="form-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={password}
                onChange={this.handleChange}
                className="form-input"
                placeholder="비밀번호"
                required
              />
              <button type="button" className="password-toggle" onClick={() => this.toggle('showPassword')}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <small className="form-help">최소 8자, 소문자/숫자/특수문자 포함</small>
          </div>

          <div className="form-group">
            <label className="form-label">비밀번호 확인</label>
            <div className="form-input-container">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={confirmPassword}
                onChange={this.handleChange}
                className="form-input"
                placeholder="비밀번호 확인"
                required
              />
              <button type="button" className="password-toggle" onClick={() => this.toggle('showConfirmPassword')}>
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? '가입 중...' : '회원가입'}
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
    const { email, confirmationCode, isLoading, error, success } = this.state;

    return (
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="auth-title">이메일 인증</h1>
          <p className="auth-subtitle">{email} 로 전송된 인증 코드를 입력하세요.</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form className="auth-form" onSubmit={this.confirmSignUp}>
          <div className="form-group">
            <label className="form-label">인증 코드</label>
            <input
              type="text"
              name="confirmationCode"
              value={confirmationCode}
              onChange={this.handleChange}
              className="form-input"
              placeholder="6자리 인증코드"
              maxLength={6}
              required
            />
          </div>

          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? '확인 중...' : '코드 확인'}
          </button>
        </form>

        <div className="auth-footer" style={{ display: 'flex', gap: 12 }}>
          <button onClick={this.resendCode} className="auth-link" disabled={isLoading}>
            <RefreshCw size={16} /> 코드 재발송
          </button>
          <button onClick={() => this.setState({ currentStep: 1 })} className="auth-link">
            <ArrowLeft size={16} /> 회원정보 다시 입력
          </button>
        </div>
      </div>
    );
  }

  render() {
    const { currentStep } = this.state;
    return (
      <CommonLayout 
        isLoggedIn={false} 
        currentUser={null} 
        navigate={this.props.navigate}
        hideSidebar={true} 
        hideSearch={true}
      >
        <div className="auth-page">
          {currentStep === 1 ? this.renderStep1() : this.renderStep2()}
        </div>
      </CommonLayout>
    );
  }
}

export default SignupPage;
