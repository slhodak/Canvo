import './Login.css';
import { Suspense, lazy } from 'react';
import { SERVER_URL } from './constants';

// Lazy load the Stytch components
const StytchLoginComponent = lazy(async () => {
  const { StytchLogin } = await import('@stytch/react');
  const { Products, OAuthProviders } = await import('@stytch/vanilla-js');

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

  return {
    default: () => <StytchLogin config={config} styles={styles} />
  };
});

const LoginOrSignup = () => {
  return (
    <div className="login-container">
      <div className="login-container-header">
        <h2>Canvo</h2>
        <p><span className="red">Node-based</span> <span className="blue">AI-powered</span> <span className="yellow">text transformation</span></p>
      </div>
      <Suspense fallback={<div>Loading login...</div>}>
        <StytchLoginComponent />
      </Suspense>
    </div>
  );
};

export default LoginOrSignup;
