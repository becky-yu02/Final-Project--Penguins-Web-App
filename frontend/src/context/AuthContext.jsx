import { createContext, useContext, useState, useEffect, useRef } from 'react';

const API = 'http://127.0.0.1:8000';
const CHECK_INTERVAL_MS = 60 * 1000; // 1 minute

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const tokenRef = useRef(token);

  function login(newToken) {
    localStorage.setItem('token', newToken);
    tokenRef.current = newToken;
    setToken(newToken);
  }

  function logout() {
    localStorage.removeItem('token');
    tokenRef.current = null;
    setToken(null);
  }

  useEffect(() => {
    const check = async () => {
      const t = tokenRef.current;
      if (!t) return;
      try {
        const res = await fetch(`${API}/penguins/users/me`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (res.status === 401) logout();
      } catch {
        // network error — don't log out, might be temporary
      }
    };

    const id = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
