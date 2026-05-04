import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const UserContext = createContext({ user: null, toggleFavorite: null });
const API = 'http://127.0.0.1:8000';

export function UserProvider({ children }) {
  const { token, logout } = useAuth();
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!token) { setUser(null); return; }
    fetch(`${API}/penguins/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (r.status === 401) { logout(); return null; }
        return r.json();
      })
      .then(data => { if (data) setUser(data); })
      .catch(() => {});
  }, [token]);

  async function toggleFavorite(placeId) {
    if (!user || !token) return;
    const isFav = user.favorite_places?.includes(placeId);
    const method = isFav ? 'DELETE' : 'POST';

    // Optimistic update
    setUser(u => ({
      ...u,
      favorite_places: isFav
        ? u.favorite_places.filter(id => id !== placeId)
        : [...(u.favorite_places ?? []), placeId],
    }));

    try {
      const res = await fetch(`${API}/penguins/users/me/favorites/${placeId}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(u => ({ ...u, favorite_places: data.favorite_places }));
      } else {
        // Revert on server error
        setUser(u => ({ ...u, favorite_places: user.favorite_places }));
      }
    } catch {
      setUser(u => ({ ...u, favorite_places: user.favorite_places }));
    }
  }

  return (
    <UserContext.Provider value={{ user, toggleFavorite }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext).user;
}

export function useToggleFavorite() {
  return useContext(UserContext).toggleFavorite;
}
