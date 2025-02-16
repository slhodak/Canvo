import { useEffect, useState } from "react";
import { SERVER_URL } from "./constants";
import App from "./App";
import LoginOrSignup from "./Login";
import { UserModel } from "../../shared/types/src/models/user";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<UserModel | null>(null);

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

    const fetchUser = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/api/get_user`, {
          credentials: 'include',
        });
        const data = await response.json();
        if (data.status === 'success') {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(null);
      }
    }
    fetchUser();
  }, []);

  if (isAuthenticated === true && user) {
    return <App user={user} />;
  }

  return <LoginOrSignup isAuthenticated={isAuthenticated} />;
};
