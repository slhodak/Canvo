import { StytchLogin } from '@stytch/react';
import { Products, OAuthProviders } from '@stytch/vanilla-js';
import './Login.css';
import { SERVER_URL } from './constants';

interface LoginOrSignupProps {
  isAuthenticated: boolean | null
}

const LoginOrSignup = ({ isAuthenticated }: LoginOrSignupProps) => {
  const config = {
    products: [
      Products.emailMagicLinks,
      Products.oauth,
      Products.passwords
    ],
    oauthOptions: {
      providers: [
        {
          type: OAuthProviders.Google,
        }
      ],
      loginRedirectURL: `${SERVER_URL}/auth/authenticate`,
      signupRedirectURL: `${SERVER_URL}/auth/authenticate`,
    },
    passwordOptions: {
      loginRedirectURL: `${SERVER_URL}/auth/authenticate`,
      resetPasswordRedirectURL: `${SERVER_URL}/auth/authenticate`,
    },
  };

  return (
    <div className="login-container">
      <StytchLogin config={config} />
      {isAuthenticated === false && <p>Credentials are invalid</p>}
    </div>
  );
};

export default LoginOrSignup;
