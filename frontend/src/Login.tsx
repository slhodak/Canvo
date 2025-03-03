import './Login.css';
import { StytchLogin } from '@stytch/react';
import { Products, OAuthProviders } from '@stytch/vanilla-js';
import { SERVER_URL } from './constants';

const LoginOrSignup = () => {
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

  const styles = {
    container: {
      borderRadius: '1px',
    },
    fontFamily: '"Helvetica New", Helvetica, sans-serif',
  };

  return (
    <div className="login-container">
      <div className="login-container-header">
        <h2>Canvo</h2>
        <p><span className="red">Node-based</span> <span className="blue">AI-powered</span> <span className="yellow">text transformation</span></p>
      </div>
      <StytchLogin config={config} styles={styles} />
    </div>
  );
};

export default LoginOrSignup;
