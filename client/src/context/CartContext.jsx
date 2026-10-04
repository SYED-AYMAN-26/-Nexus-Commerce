import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { cartApi } from '../services';
import { useAuth } from './AuthContext';
import { BUSINESS } from '../utils/constants';
import { useToast } from './ToastContext';

const CartContext = createContext(null);
export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
};

export const GUEST_CART_KEY = 'nexus.guestCart';

const readGuestCart = () => {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeGuestCart = (items) => {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  } catch {
    /* storage may be unavailable */
  }
};

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

/**
 * Mirrors the server's pricing rules for signed-out shoppers so the mini cart
 * still shows correct numbers. Authenticated carts always use server totals.
 */
function computeGuestTotals(items) {
  const subtotal = round2(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0));
  const productDiscount = round2(
    items.reduce((sum, item) => sum + (item.compareAtPrice ? (item.compareAtPrice - item.unitPrice) * item.quantity : 0), 0),
  );
  const shipping = items.length === 0 || subtotal >= BUSINESS.freeShippingThreshold ? 0 : BUSINESS.shippingFlatRate;
  const tax = round2(subtotal * BUSINESS.taxRate);
  return {
    subtotal,
    productDiscount,
    discount: productDiscount,
    couponDiscount: 0,
    shipping,
    tax,
    taxRate: BUSINESS.taxRate,
    total: round2(subtotal + shipping + tax),
    currency: BUSINESS.currency,
    freeShippingThreshold: BUSINESS.freeShippingThreshold,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

const EMPTY_CART = {
  _id: null,
  items: [],
  unavailableItems: [],
  itemCount: 0,
  uniqueItemCount: 0,
  coupon: null,
  totals: computeGuestTotals([]),
};

/**
 * Unified cart state.
 *
 * Signed out  -> an offline cart in localStorage (merged into the account cart
 *                automatically on the next sign in via POST /api/cart/merge).
 * Signed in   -> the server cart, with all totals calculated server-side.
 */
export function CartProvider({ children }) {
  const { isAuthenticated, status } = useAuth();
  const toast = useToast();

  const [cart, setCart] = useState(EMPTY_CART);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState(null);
  const loadedFor = useRef(null);

  const isGuest = !isAuthenticated;

  /* ------------------------------------------------------------ loading */

  const loadCart = useCallback(
    async ({ silent = false } = {}) => {
      if (!isAuthenticated) return null;
      if (!silent) setLoading(true);
      try {
        const { cart: serverCart } = await cartApi.get();
        setCart(serverCart);
        return serverCart;
      } catch (error) {
        if (error.status === 401) setCart(EMPTY_CART);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated],
  );

  useEffect(() => {
    if (status === 'loading') return;

    if (isAuthenticated) {
      loadCart();
      loadedFor.current = 'auth';
    } else if (loadedFor.current !== 'guest') {
      const items = readGuestCart();
      setCart({ ...EMPTY_CART, items, itemCount: items.reduce((sum, i) => sum + i.quantity, 0), uniqueItemCount: items.length, totals: computeGuestTotals(items) });
      loadedFor.current = 'guest';
    }
  }, [isAuthenticated, status, loadCart]);

  // A guest cart merge completes inside AuthContext; adopt the returned cart.
  useEffect(() => {
    const handler = (event) => {
      if (event.detail) {
        setCart(event.detail);
        toast.success('Your cart has been synced to your account');
      }
    };
    window.addEventListener('nexus:cart-merged', handler);
    return () => window.removeEventListener('nexus:cart-merged', handler);
  }, [toast]);

  /* ------------------------------------------------------------ mutations */

  const applyGuestItems = useCallback((items) => {
    writeGuestCart(items);
    setCart({ ...EMPTY_CART, items, itemCount: items.reduce((sum, i) => sum + i.quantity, 0), uniqueItemCount: items.length, totals: computeGuestTotals(items) });
  }, []);

  /**
   * @param {object} product  product document (guest mode needs the snapshot)
   * @param {number} quantity
   * @param {object} variant  selected variant or null
   */
  const addItem = useCallback(
    async (product, quantity = 1, variant = null) => {
      setMutating(true);
      try {
        if (isAuthenticated) {
          const { cart: serverCart } = await cartApi.add({
            productId: product._id,
            quantity,
            variantId: variant?._id || null,
          });
          setCart(serverCart);
        } else {
          const items = readGuestCart();
          const key = `${product._id}:${variant?._id || ''}`;
          const existing = items.find((item) => item.key === key);
          const unitPrice = (product.discountPrice > 0 && product.discountPrice < product.price ? product.discountPrice : product.price) + (variant?.priceDelta || 0);
          const maxStock = variant ? variant.stock : product.stock;

          if (existing) {
            existing.quantity = Math.min(existing.quantity + quantity, Math.min(maxStock, BUSINESS.maxQtyPerLineItem));
          } else {
            items.push({
              key,
              _id: key,
              productId: product._id,
              name: product.name,
              slug: product.slug,
              image: variant?.image || product.images?.[0] || '',
              brand: product.brand,
              variantId: variant?._id || null,
              variantName: variant?.name || '',
              quantity: Math.min(quantity, Math.min(maxStock, BUSINESS.maxQtyPerLineItem)),
              unitPrice: round2(unitPrice),
              compareAtPrice: product.price > unitPrice ? round2(product.price) : null,
              maxStock,
            });
          }
          applyGuestItems(items);
        }

        setLastAdded({ name: product.name, quantity, variantName: variant?.name || '' });
        setDrawerOpen(true);
        toast.success(`${product.name} added to your cart`, {
          action: { label: 'View cart', onClick: () => { window.location.href = '/cart'; } },
        });
        return true;
      } catch (error) {
        toast.error(error.message || 'Could not add that item to your cart');
        return false;
      } finally {
        setMutating(false);
      }
    },
    [isAuthenticated, applyGuestItems, toast],
  );

  const updateQuantity = useCallback(
    async (itemId, quantity) => {
      if (quantity < 1) return;
      setMutating(true);
      try {
        if (isAuthenticated) {
          const { cart: serverCart } = await cartApi.update(itemId, quantity);
          setCart(serverCart);
        } else {
          const items = readGuestCart().map((item) =>
            item._id === itemId ? { ...item, quantity: Math.min(quantity, item.maxStock, BUSINESS.maxQtyPerLineItem) } : item,
          );
          applyGuestItems(items);
        }
      } catch (error) {
        toast.error(error.message || 'Could not update the quantity');
      } finally {
        setMutating(false);
      }
    },
    [isAuthenticated, applyGuestItems, toast],
  );

  const removeItem = useCallback(
    async (itemId, { silent = false } = {}) => {
      setMutating(true);
      try {
        if (isAuthenticated) {
          const { cart: serverCart } = await cartApi.remove(itemId);
          setCart(serverCart);
        } else {
          applyGuestItems(readGuestCart().filter((item) => item._id !== itemId));
        }
        if (!silent) toast.success('Item removed from your cart');
      } catch (error) {
        toast.error(error.message || 'Could not remove that item');
      } finally {
        setMutating(false);
      }
    },
    [isAuthenticated, applyGuestItems, toast],
  );

  const clearCart = useCallback(async () => {
    setMutating(true);
    try {
      if (isAuthenticated) {
        const { cart: serverCart } = await cartApi.clear();
        setCart(serverCart);
      } else {
        applyGuestItems([]);
      }
      toast.success('Your cart is now empty');
    } catch (error) {
      toast.error(error.message || 'Could not clear the cart');
    } finally {
      setMutating(false);
    }
  }, [isAuthenticated, applyGuestItems, toast]);

  const applyCoupon = useCallback(
    async (code) => {
      if (!isAuthenticated) throw new Error('Sign in to apply a coupon');
      const data = await cartApi.applyCoupon(code);
      setCart(data.cart);
      return data.cart.coupon;
    },
    [isAuthenticated],
  );

  const removeCoupon = useCallback(async () => {
    if (!isAuthenticated) return;
    const data = await cartApi.removeCoupon();
    setCart(data.cart);
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({
      cart,
      items: cart.items || [],
      unavailableItems: cart.unavailableItems || [],
      totals: cart.totals || EMPTY_CART.totals,
      coupon: cart.coupon || null,
      itemCount: cart.itemCount || 0,
      uniqueItemCount: cart.items?.length || 0,
      loading: loading || status === 'loading',
      mutating,
      isGuest,
      drawerOpen,
      lastAdded,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      applyCoupon,
      removeCoupon,
      refresh: loadCart,
      /** Free shipping progress for the cart page nudge. */
      freeShippingRemaining: Math.max(0, (cart.totals?.freeShippingThreshold || BUSINESS.freeShippingThreshold) - (cart.totals?.subtotal || 0)),
    }),
    [
      cart, loading, status, mutating, isGuest, drawerOpen, lastAdded,
      addItem, updateQuantity, removeItem, clearCart, applyCoupon, removeCoupon, loadCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
