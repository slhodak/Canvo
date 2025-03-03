import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { STYTCH_PUBLIC_TOKEN, APP_DOMAIN } from './constants';
import './index.css'
import Home from './Home';

// Lazy load both the provider and client initialization
const StytchSetup = lazy(async () => {
  const { StytchProvider } = await import('@stytch/react');
  const { StytchUIClient } = await import('@stytch/vanilla-js');

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

  return {
    default: ({ children }: { children: React.ReactNode }) => (
      <StytchProvider stytch={stytchClient}>
        {children}
      </StytchProvider>
    )
  };
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<div></div>}>
      <StytchSetup>
        <Home />
      </StytchSetup>
    </Suspense>
  </StrictMode>,
)
