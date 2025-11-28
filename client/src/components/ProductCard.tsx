import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '@/lib/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import PriceDisplay from './PriceDisplay';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = React.memo(({ product }) => {
  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/30 interactive-card">
      <Link to={`/product/${product.id}`} className="flex-grow">
        <div className="relative aspect-square overflow-hidden">
          <img
            src={product.image || '/placeholder.jpg'}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            loading="lazy"
          />
        </div>
      </Link>
      <CardContent className="p-4 flex-grow">
        <Link to={`/product/${product.id}`}>
          <h3 className="text-lg font-semibold truncate hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
          {product.description}
        </p>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <PriceDisplay price={product.price} discount={product.discount} />
        <Button size="sm" className="glow-box">
          <ShoppingCart className="w-4 h-4 mr-2" />
          View
        </Button>
      </CardFooter>
    </Card>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
