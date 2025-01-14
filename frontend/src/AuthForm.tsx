import { useState } from 'react';
import './AuthForm.css';
import { SERVER_URL } from './constants';

function AuthForm({ setIsAuthenticated }: { setIsAuthenticated: (isAuthenticated: boolean) => void }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [userEnteredInvalidCode, setUserEnteredInvalidCode] = useState(false);

  const handleSubmit = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/auth/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
        credentials: 'include',
      });
      const data = await response.json();
      if (data.status === 'success') {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setUserEnteredInvalidCode(true);
      }
    } catch (error) {
      console.error('Error logging in:', error);
      setIsAuthenticated(false);
      setUserEnteredInvalidCode(true);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSubmit();
      (document.activeElement as HTMLElement).blur();
    }
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form" onKeyDown={handleKeyDown}>
        <input
          type="email"
          id="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="text"
          id="code"
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Invite Code"
          required
        />
        <button onClick={handleSubmit}>Log In</button>
      </div>
      {userEnteredInvalidCode && (
        <div className="error-message">
          Sorry! We didn't recognize that invite code.
          <br />
          Please make sure both the email and code are entered correctly.
        </div>
      )}
    </div>
  );
};

export default AuthForm;
