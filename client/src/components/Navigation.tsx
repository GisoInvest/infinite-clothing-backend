import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ShoppingCart, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import PromoBanner from './PromoBanner';

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { totalItems } = useCart();
  const [location] = useLocation();

  const categories = [
    { name: 'Men', path: '/men' },
    { name: 'Women', path: '/women' },
    { name: 'Unisex', path: '/unisex' },
    { name: 'Kids & Baby', path: '/kids-baby' },
  ];

  const isActive = (path: string) => location === path;

  return (
    <>
      <PromoBanner />
      <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-primary/20 glow-border">
      <div className="container">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/">
            <a className="flex items-center space-x-2">
              <img src="/logo.png" alt="INF!NITE C107HING" className="h-12 w-auto" />
            </a>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {categories.map((category) => (
              <Link key={category.path} href={category.path}>
                <a
                  className={`text-sm font-medium transition-all hover:text-primary ${
                    isActive(category.path) ? 'text-primary glow-text' : 'text-foreground'
                  }`}
                >
                  {category.name}
                </a>
              </Link>
            ))}
            <Link href="/about">
              <a
                className={`text-sm font-medium transition-all hover:text-primary ${
                  isActive('/about') ? 'text-primary glow-text' : 'text-foreground'
                }`}
              >
                About
              </a>
            </Link>
            <Link href="/track-order">
              <a
                className={`text-sm font-medium transition-all hover:text-primary ${
                  isActive('/track-order') ? 'text-primary glow-text' : 'text-foreground'
                }`}
              >
                Track Order
              </a>
            </Link>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Cart */}
            <Link href="/cart">
              <a>
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center glow-box">
                      {totalItems}
                    </span>
                  )}
                </Button>
              </a>
            </Link>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-primary/20">
            <div className="flex flex-col space-y-4">
              {categories.map((category) => (
                <Link key={category.path} href={category.path}>
                  <a
                    className={`text-sm font-medium transition-all hover:text-primary ${
                      isActive(category.path) ? 'text-primary glow-text' : 'text-foreground'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {category.name}
                  </a>
                </Link>
              ))}
              <Link href="/about">
                <a
                  className={`text-sm font-medium transition-all hover:text-primary ${
                    isActive('/about') ? 'text-primary glow-text' : 'text-foreground'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About
                </a>
              </Link>
              <Link href="/track-order">
                <a
                  className={`text-sm font-medium transition-all hover:text-primary ${
                    isActive('/track-order') ? 'text-primary glow-text' : 'text-foreground'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Track Order
                </a>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
    </>
  );
}

