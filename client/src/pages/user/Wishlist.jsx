import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../../components/ui/Misc';
import { AccountNav } from '../../components/common/AccountNav';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { EmptyState } from '../../components/ui/Feedback';
import { ProductGrid } from '../../components/product/ProductCard';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { useState } from 'react';

export default function Wishlist() {
  const { wishlist, wishlistLoading, wishlistCount } = useAuth();
  const { addItem } = useCart();
  const toast = useToast();
  const [addingAll, setAddingAll] = useState(false);

  const purchasable = wishlist.filter((product) => product.inStock);

  const addAllToCart = async () => {
    setAddingAll(true);
    let added = 0;
    for (const product of purchasable) {
      try {
        // Variant products need a size/colour choice, so send the shopper to the product page.
        if (product.hasVariants) continue;
        await addItem({ productId: product._id, quantity: 1 });
        added += 1;
      } catch {
        /* continue with the rest of the list */
      }
    }
    setAddingAll(false);
    if (added) toast.success(`${added} item${added === 1 ? '' : 's'} added to your cart`);
    else toast.info('Those items need a size or colour selected first.');
  };

  return (
    <div className="container-page py-8 lg:py-10">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'My account', to: '/account' }, { label: 'Wishlist' }]} />

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">My wishlist</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            {wishlistCount ? `${wishlistCount} saved item${wishlistCount === 1 ? '' : 's'} — we keep an eye on the price for you.` : 'Save products you love and buy them later.'}
          </p>
        </div>
        {purchasable.length > 0 && (
          <Button variant="outline" loading={addingAll} onClick={addAllToCart} icon={<Icon name="cart" className="h-4 w-4" />}>
            Add available items to cart
          </Button>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <AccountNav />

        <div className="min-w-0">
          {wishlistLoading ? (
            <ProductGrid loading count={6} />
          ) : wishlist.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-300 bg-ink-50/40">
              <EmptyState
                icon="heart"
                title="Your wishlist is empty"
                description="Tap the heart on any product to save it here for later."
                action={<Button to="/products">Browse products</Button>}
              />
            </div>
          ) : (
            <>
              <ProductGrid products={wishlist} />
              <p className="mt-6 text-center text-xs text-ink-500">
                Tip: use the heart icon on a card to remove an item from your wishlist.{' '}
                <Link to="/products" className="link font-semibold">
                  Continue shopping
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
