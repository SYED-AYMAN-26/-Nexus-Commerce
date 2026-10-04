import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, cartApi, wishlistApi } from '../services';
import { sessionHint, tokenStore } from '../services/api';

const AuthContext = createContext(null);
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

const GUEST_CART_KEY = 'nexus.guestCart';

const readGuestCart = () => {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Session state.
 *
 * The server is the source of truth: on boot we call `/auth/profile` with the
 * httpOnly cookie. A guest cart kept in localStorage is merged into the account
 * cart right after a successful sign in / registration.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | guest
  const [wishlist, setWishlist] = useState([]);
  const [merging, setMerging] = useState(false);

  const applySession = useCallback((payload) => {
    sessionHint.set(true);
    if (payload?.user) setUser(payload.user);
    if (payload?.token) tokenStore.set(payload.token);
    if (payload?.user?.wishlist) setWishlist(payload.user.wishlist.map(String));
    setStatus('authenticated');
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setWishlist([]);
    tokenStore.set(null);
    sessionHint.set(false);
    setStatus('guest');
  }, []);

  /** Restore the session on first paint. */
  useEffect(() => {
    // Guests skip the round trip entirely - no session means no 401 noise.
    if (!sessionHint.get() && !tokenStore.get()) {
      setStatus('guest');
      return undefined;
    }

    let active = true;
    (async () => {
      try {
        const data = await authApi.profile();
        if (!active) return;
        setUser(data.user);
        setWishlist((data.wishlistDetailed || data.user?.wishlist || []).map((item) => String(item?._id || item)));
        setStatus('authenticated');
      } catch {
        if (!active) return;
        tokenStore.set(null);
        sessionHint.set(false);
        setUser(null);
        setStatus('guest');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  /** Push any offline cart into the account cart after signing in. */
  const syncGuestCart = useCallback(async () => {
    const guestItems = readGuestCart();
    if (!guestItems.length) return null;
    setMerging(true);
    try {
      const { cart } = await cartApi.merge(
        guestItems.map((item) => ({ productId: item.productId, quantity: item.quantity, variantId: item.variantId || null })),
      );
      localStorage.removeItem(GUEST_CART_KEY);
      window.dispatchEvent(new CustomEvent('nexus:cart-merged', { detail: cart }));
      return cart;
    } catch {
      return null;
    } finally {
      setMerging(false);
    }
  }, []);

  const login = useCallback(
    async (credentials) => {
      const data = await authApi.login(credentials);
      applySession(data);
      await syncGuestCart();
      return data;
    },
    [applySession, syncGuestCart],
  );

  const register = useCallback(
    async (payload) => {
      const data = await authApi.register(payload);
      applySession(data);
      await syncGuestCart();
      return data;
    },
    [applySession, syncGuestCart],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* clearing locally is enough even if the call fails */
    }
    clearSession();
  }, [clearSession]);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await authApi.profile();
      setUser(data.user);
      setWishlist((data.wishlistDetailed || []).map((item) => String(item?._id || item)));
      return data.user;
    } catch {
      clearSession();
      return null;
    }
  }, [clearSession]);

  const updateProfile = useCallback(async (payload) => {
    const data = await authApi.updateProfile(payload);
    setUser(data.user);
    return data.user;
  }, []);

  const changePassword = useCallback(async (payload) => {
    const data = await authApi.changePassword(payload);
    if (data?.token) tokenStore.set(data.token);
    return data;
  }, []);

  /* -------------------------------------------------------------- wishlist */
  const isWishlisted = useCallback((productId) => wishlist.includes(String(productId)), [wishlist]);

  const toggleWishlist = useCallback(
    async (productId, { silent } = {}) => {
      if (status !== 'authenticated') {
        const error = new Error('Sign in to save products to your wishlist');
        error.code = 'AUTH_REQUIRED';
        throw error;
      }
      const id = String(productId);
      const alreadySaved = wishlist.includes(id);

      // Optimistic update - rolled back on failure
      setWishlist((current) => (alreadySaved ? current.filter((x) => x !== id) : [...current, id]));
      try {
        if (alreadySaved) await wishlistApi.remove(id);
        else await wishlistApi.add(id);
        return { saved: !alreadySaved, silent };
      } catch (error) {
        setWishlist((current) => (alreadySaved ? [...current, id] : current.filter((x) => x !== id)));
        throw error;
      }
    },
    [status, wishlist],
  );

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      isAdmin: user?.role === 'admin',
      isLoading: status === 'loading',
      merging,
      wishlist,
      wishlistCount: wishlist.length,
      login,
      register,
      logout,
      refreshProfile,
      updateProfile,
      changePassword,
      isWishlisted,
      toggleWishlist,
      setWishlist,
    }),
    [user, status, merging, wishlist, login, register, logout, refreshProfile, updateProfile, changePassword, isWishlisted, toggleWishlist],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { GUEST_CART_KEY };
