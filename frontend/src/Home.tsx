import { useEffect, useState } from "react";
import { SERVER_URL } from "./constants";
import App from "./App";
import LoginOrSignup from "./Login";
import { UserModel } from "../../shared/types/src/models/user";

enum LoginState {
  INITIAL = "initial",
  LOGGED_IN = "logged_in",
  LOGGED_OUT = "logged_out",
  ERROR = "error",
}

export default function Home() {
  const [loginState, setLoginState] = useState<LoginState>(LoginState.INITIAL);
  const [user, setUser] = useState<UserModel | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/api/get_user`, {
          credentials: 'include',
        });
        const data = await response.json();
        if (data.status === 'success') {
          setUser(data.user);
          setLoginState(LoginState.LOGGED_IN);
        } else {
          setLoginState(LoginState.LOGGED_OUT);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setLoginState(LoginState.ERROR);
      }
    }

    const checkAuthentication = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/auth/check`, {
          credentials: 'include',
        });
        const data = await response.json();
        if (data.status === 'success') {
          fetchUser();
        } else if (data.status === 'failed') {
          setLoginState(LoginState.LOGGED_OUT);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setLoginState(LoginState.ERROR);
      }
    };

    checkAuthentication();
  }, []);

  if (loginState === LoginState.INITIAL) {
    return <div className="home-loading-screen"></div>;
  } else if (loginState === LoginState.LOGGED_IN && user) {
    return <App user={user} />;
  } else {
    return <LoginOrSignup />;
  }
};
