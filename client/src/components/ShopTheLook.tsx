import { trpc } from '@/lib/trpc';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingCart, Plus } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { Link } from 'wouter';

export default function ShopTheLook() {
  const { data: outfits, isLoading } = trpc.outfits.getActive.useQuery();
  const { data: allProducts } = trpc.products.getAll.useQuery();
  const { addItem } = useCart();

  const handleAddAllToCart = (outfit: any) => {
    if (!allProducts) {
      toast.error('Products not loaded yet');
      return;
    }

    const outfitProducts = allProducts.filter(p => outfit.productIds.includes(p.id));
    
    if (outfitProducts.length === 0) {
      toast.error('Products not found');
      return;
    }

    outfitProducts.forEach(product => {
      addItem({
        productId: product.id,
        productName: product.name,
        price: product.price,
        image: product.images?.[0],
        category: product.category,
        subcategory: product.subcategory,
      });
    });

    toast.success(`${outfitProducts.length} items added to cart!`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!outfits || outfits.length === 0) {
    return null; // Don't show section if no outfits
  }

  return (
    <section className="py-20 bg-gradient-to-b from-background to-slate-900/50">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Shop The <span className="text-primary glow-text">Look</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Complete outfits curated for your style
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {outfits.map((outfit) => {
            const outfitProducts = allProducts?.filter(p => outfit.productIds.includes(p.id)) || [];
            
            return (
              <Card
                key={outfit.id}
                className="group overflow-hidden border-primary/20 hover:border-primary/50 transition-all duration-300 interactive-card"
              >
                {/* Outfit Image */}
                <div className="aspect-square overflow-hidden bg-muted relative">
                  {outfit.image ? (
                    <img
                      src={outfit.image}
                      alt={outfit.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        console.error('Failed to load outfit image:', outfit.image);
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center fallback-icon">
                      <ShoppingCart className="h-20 w-20 text-muted-foreground" />
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Product hotspots */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-black/70 backdrop-blur-sm rounded-lg p-4 space-y-2 max-w-[80%]">
                      {outfitProducts.map((product, idx) => (
                        <Link key={product.id} href={`/product/${product.id}`}>
                          <a className="block text-sm text-white hover:text-primary transition-colors">
                            <Plus className="inline h-3 w-3 mr-1" />
                            {product.name} - £{(product.price / 100).toFixed(2)}
                          </a>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                <CardContent className="p-6 space-y-4">
                  <div>
                    <h3 className="font-bold text-xl mb-2 group-hover:text-primary transition-colors">
                      {outfit.name}
                    </h3>
                    {outfit.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {outfit.description}
                      </p>
                    )}
                  </div>

                  {/* Product list */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-semibold">Includes:</p>
                    {outfitProducts.slice(0, 3).map((product) => (
                      <p key={product.id} className="text-xs text-muted-foreground">
                        • {product.name}
                      </p>
                    ))}
                    {outfitProducts.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        + {outfitProducts.length - 3} more items
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-primary/20">
                    <div>
                      <p className="text-xs text-muted-foreground">Complete Look</p>
                      <p className="text-2xl font-bold text-primary glow-text">
                        £{(outfit.totalPrice / 100).toFixed(2)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="glow-box"
                      onClick={() => handleAddAllToCart(outfit)}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add All
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
