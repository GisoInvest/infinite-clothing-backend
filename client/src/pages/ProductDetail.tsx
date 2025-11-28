import { useState } from 'react';
import { useRoute, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { trpc } from '@/lib/trpc';
import { useCart } from '@/contexts/CartContext';
import { Loader2, ShoppingBag, ChevronLeft } from 'lucide-react';

import { toast } from 'sonner';
import PriceDisplay from '@/components/PriceDisplay';
import SEO from '@/components/SEO';
import { ProductStructuredData, BreadcrumbStructuredData } from '@/components/StructuredData';
import ProductReviews from '@/components/ProductReviews';

export default function ProductDetail() {
  const [, params] = useRoute('/product/:id');
  const productId = params?.id ? parseInt(params.id) : 0;
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  
  const { data: product, isLoading, error } = trpc.products.getById.useQuery(
    { id: productId },
    { enabled: productId > 0 }
  );
  const { addItem } = useCart();

  const handleAddToCart = () => {
    if (!product) return;
    
    // Check if product has sizes and none is selected
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      toast.error('Please select a size');
      return;
    }
    
    // Check if product has colors and none is selected
    if (product.colors && product.colors.length > 0 && !selectedColor) {
      toast.error('Please select a color');
      return;
    }
    
    // Calculate discounted price
    const finalPrice = product.discount > 0 
      ? Math.round(product.price * (1 - product.discount / 100))
      : product.price;
    
    addItem({
      productId: product.id,
      productName: product.name,
      price: finalPrice,
      image: product.images?.[0],
      category: product.category,
      subcategory: product.subcategory,
      size: selectedSize || undefined,
      color: selectedColor || undefined,
      discount: product.discount || 0,
    });
    toast.success(`${product.name} added to cart!`);
  };

  const productUrl = `https://infiniteclothingstore.co.uk/product/${productId}`;
  const finalPrice = product?.discount ? (product.price * (1 - product.discount / 100)).toFixed(2) : product?.price.toFixed(2);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Product Not Found</h1>
            <Link href="/">
              <a>
                <Button>Back to Home</Button>
              </a>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const allMedia = [
    ...(product.images || []).map((url) => ({ type: 'image' as const, url })),
    ...(product.videos || []).map((url) => ({ type: 'video' as const, url })),
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title={product.name}
        description={product.description || undefined}
        keywords={`${product.name}, ${product.category}, streetwear, ${product.subcategory || ''}`}
        image={product.images?.[0]}
        url={productUrl}
        type="product"
        price={finalPrice}
        availability={product.stock > 0 ? 'in stock' : 'out of stock'}
      />
      <ProductStructuredData product={product} />
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: 'https://infiniteclothingstore.co.uk' },
          { name: product.category, url: `https://infiniteclothingstore.co.uk/${product.category}` },
          { name: product.name, url: productUrl },
        ]}
      />
      <Navigation />

      <div className="flex-1 py-12">
        <div className="container">
          <Link href={`/${product.category}`}>
            <a className="inline-flex items-center text-primary hover:underline mb-6">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to {product.category}
            </a>
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Media Gallery */}
            <div className="space-y-4">
              {/* Main Media */}
              <Card className="aspect-square overflow-hidden border-primary/20 glow-border">
                {allMedia.length > 0 ? (
                  allMedia[selectedMediaIndex].type === 'image' ? (
                    <img
                      src={allMedia[selectedMediaIndex].url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={allMedia[selectedMediaIndex].url}
                      controls
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <ShoppingBag className="h-32 w-32 text-muted-foreground" />
                  </div>
                )}
              </Card>

              {/* Thumbnails */}
              {allMedia.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                  {allMedia.map((media, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedMediaIndex(index)}
                      className={`aspect-square rounded overflow-hidden border-2 transition-all ${
                        selectedMediaIndex === index
                          ? 'border-primary glow-border'
                          : 'border-primary/20 hover:border-primary/50'
                      }`}
                    >
                      {media.type === 'image' ? (
                        <img
                          src={media.url}
                          alt={`${product.name} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-xs">VIDEO</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                <p className="text-sm text-primary uppercase tracking-wider mb-2">
                  {product.category} • {product.subcategory}
                </p>
                <h1 className="text-4xl md:text-5xl font-bold mb-4 glow-text">
                  {product.name}
                </h1>
                <PriceDisplay price={product.price} discount={product.discount} size="large" />
              </div>

              <div className="border-t border-b border-primary/20 py-6">
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              </div>

              <div className="space-y-4">
                {/* Size Selector */}
                {product.sizes && product.sizes.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-base">Select Size *</Label>

                    </div>
                    <RadioGroup value={selectedSize} onValueChange={setSelectedSize}>
                      <div className="grid grid-cols-5 gap-2">
                        {product.sizes.map((size) => (
                          <div key={size}>
                            <RadioGroupItem
                              value={size}
                              id={`size-${size}`}
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor={`size-${size}`}
                              className="flex items-center justify-center rounded-md border-2 border-primary/20 bg-transparent px-3 py-2 hover:bg-primary/10 hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/20 cursor-pointer transition-all"
                            >
                              {size}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {/* Color Selector */}
                {product.colors && product.colors.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-base">Select Color *</Label>
                    <RadioGroup value={selectedColor} onValueChange={setSelectedColor}>
                      <div className="grid grid-cols-3 gap-2">
                        {product.colors.map((color) => (
                          <div key={color}>
                            <RadioGroupItem
                              value={color}
                              id={`color-${color}`}
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor={`color-${color}`}
                              className="flex items-center justify-center rounded-md border-2 border-primary/20 bg-transparent px-4 py-3 hover:bg-primary/10 hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/20 cursor-pointer transition-all"
                            >
                              {color}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {/* Stock Info */}
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Stock:</span>
                  <span className={`font-semibold ${product.stock > 0 ? 'text-primary' : 'text-destructive'}`}>
                    {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
                  </span>
                </div>

                {/* Add to Cart Button */}
                <Button
                  size="lg"
                  className="w-full glow-box text-lg"
                  onClick={handleAddToCart}
                  disabled={product.stock <= 0}
                >
                  {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                </Button>
              </div>

              <div className="bg-card/50 border border-primary/20 rounded-lg p-6 space-y-3">
                <h3 className="font-semibold text-primary">Product Details</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Premium quality materials</li>
                  <li>• Comfortable fit for all-day wear</li>
                  <li>• Machine washable</li>
                  <li>• Free shipping on orders over £50</li>
                  <li>• 30-day return policy</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Product Reviews Section */}
          <div className="container mt-16">
            <ProductReviews productId={product.id} />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

