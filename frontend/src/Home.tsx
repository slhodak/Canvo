import App from './App';
import AuthForm from './AuthForm';
import { useState, useEffect } from 'react';
import { SERVER_URL } from './constants';

const Home = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const response = await fetch(`${SERVER_URL}/auth/check`, {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.status === 'success') {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    };

    checkSession();
  }, []);

  return isAuthenticated === false ? (
    <AuthForm setIsAuthenticated={setIsAuthenticated} />
  ) : (
    <App />
  );
};

export default Home;
