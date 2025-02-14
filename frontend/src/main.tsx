import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StytchProvider } from '@stytch/react';
import { StytchUIClient } from '@stytch/vanilla-js';
import { STYTCH_PUBLIC_TOKEN, APP_DOMAIN } from './constants';
import './index.css'
import Home from './Home';

const stytchOptions = {
  cookieOptions: {
    opaqueTokenCookieName: "stytch_session",
    jwtCookieName: "stytch_session_jwt",
    path: "/",
    availableToSubdomains: true,
    domain: APP_DOMAIN,
  }
}

const stytchClient = new StytchUIClient(
  STYTCH_PUBLIC_TOKEN,
  stytchOptions
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StytchProvider stytch={stytchClient}>
      <Home />
    </StytchProvider>
  </StrictMode>,
)
