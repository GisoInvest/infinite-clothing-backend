import { useState } from 'react';
import { Link } from 'react-router-dom'; // Use react-router-dom Link for ProductCard
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard'; // Import the memoized component
import { trpc } from '@/lib/trpc';
import { Loader2, ShoppingBag } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import StarRating from '@/components/StarRating';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProductListProps {
  category: 'men' | 'women' | 'unisex' | 'kids-baby';
  title: string;
  subcategories: string[];
}

export default function ProductList({ category, title, subcategories }: ProductListProps) {
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  // Removed addItem as it's not used in this component anymore
  // const { addItem } = useCart();
  const { data: products, isLoading } = trpc.products.getAll.useQuery({
    category,
    subcategory: selectedSubcategory === 'all' ? undefined : selectedSubcategory,
  });

  // Removed handleAddToCart as it's now handled within ProductCard (View button)
  // const handleAddToCart = (product: any) => {
  //   addItem({
  //     productId: product.id,
  //     productName: product.name,
  //     price: product.price,
  //     image: product.images?.[0],
  //     category: product.category,
  //     subcategory: product.subcategory,
  //   });
  //   toast.success(`${product.name} added to cart!`);
  // };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <div className="flex-1">
        {/* Header */}
        <section className="py-12 bg-card/50 border-b border-primary/20">
          <div className="container">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 glow-text">{title}</h1>
            <p className="text-muted-foreground text-lg">
              Explore our collection of premium streetwear
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="py-6 border-b border-primary/20">
          <div className="container">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Filter by:</label>
                <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {subcategories.map((sub) => (
                      <SelectItem key={sub} value={sub.toLowerCase().replace(/ & /g, '-')}>
                        {sub}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {products && (
                <p className="text-sm text-muted-foreground">
                  {products.length} {products.length === 1 ? 'product' : 'products'} found
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Products Grid */}
        <section className="py-12">
          <div className="container">
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : products && products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product as any} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <ShoppingBag className="h-20 w-20 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  No products found in this category.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}

