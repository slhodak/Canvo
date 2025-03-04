import { useEffect, useState } from "react";
import App from "./App";
import LoginOrSignup from "./Login";
import { UserModel } from "wc-shared";
import { checkAuthentication, getUser } from "wc-shared";

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
        const user = await getUser();
        if (user) {
          setUser(user);
          setLoginState(LoginState.LOGGED_IN);
        } else {
          setLoginState(LoginState.LOGGED_OUT);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setLoginState(LoginState.ERROR);
      }
    }

    const checkAuth = async () => {
      try {
        const success = await checkAuthentication();
        if (success) {
          fetchUser();
        } else {
          setLoginState(LoginState.LOGGED_OUT);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setLoginState(LoginState.ERROR);
      }
    };

    checkAuth();
  }, []);

  if (loginState === LoginState.INITIAL) {
    return <div className="home-loading-screen"></div>;
  } else if (loginState === LoginState.LOGGED_IN && user) {
    return <App user={user} />;
  } else {
    return <LoginOrSignup />;
  }
};
