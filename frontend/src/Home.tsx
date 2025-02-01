import { useEffect, useState } from "react";
import { SERVER_URL } from "./constants";
import App from "./App";
import LoginOrSignup from "./Login";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuthentication = async () => {
      const response = await fetch(`${SERVER_URL}/auth/check`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.status === 'success') {
        setIsAuthenticated(true);
      } else if (data.status === 'failed') {
        setIsAuthenticated(false);
      }
    };
    checkAuthentication();
  }, []);

  if (isAuthenticated === true) {
    return <App />;
  }

  return <LoginOrSignup isAuthenticated={isAuthenticated} />;
};
