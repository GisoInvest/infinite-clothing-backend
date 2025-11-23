import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Loader2, Mail } from 'lucide-react';

function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  
  const subscribe = trpc.newsletter.subscribe.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setEmail('');
      setName('');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to subscribe');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }
    subscribe.mutate({ email: email.trim(), name: name.trim() || undefined });
  };

  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Mail className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-primary text-lg">Subscribe to Our Newsletter</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Get the latest updates on new products, exclusive offers, and style tips delivered to your inbox.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <Input
          type="text"
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
          disabled={subscribe.isPending}
        />
        <Input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
          required
          disabled={subscribe.isPending}
        />
        <Button type="submit" className="glow-box" disabled={subscribe.isPending}>
          {subscribe.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Subscribe
        </Button>
      </form>
    </div>
  );
}

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-primary/20 mt-20">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <img src="/logo.png" alt="INF!NITE C107HING" className="h-12 w-auto mb-4" />
            <p className="text-sm text-muted-foreground max-w-md">
              Infinite Clothing redefines modern streetwear with purpose-driven designs that inspire confidence, creativity, and individuality. Every piece blends bold expression with comfort. Wear what moves you.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h3 className="font-semibold text-primary mb-4">Shop</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/men">
                  <a className="text-muted-foreground hover:text-primary transition-colors">Men</a>
                </Link>
              </li>
              <li>
                <Link href="/women">
                  <a className="text-muted-foreground hover:text-primary transition-colors">Women</a>
                </Link>
              </li>
              <li>
                <Link href="/unisex">
                  <a className="text-muted-foreground hover:text-primary transition-colors">Unisex</a>
                </Link>
              </li>
              <li>
                <Link href="/kids-baby">
                  <a className="text-muted-foreground hover:text-primary transition-colors">Kids & Baby</a>
                </Link>
              </li>
            </ul>
          </div>

          {/* Information */}
          <div>
            <h3 className="font-semibold text-primary mb-4">Information</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about">
                  <a className="text-muted-foreground hover:text-primary transition-colors">About Us</a>
                </Link>
              </li>
              <li>
                <Link href="/blog">
                  <a className="text-muted-foreground hover:text-primary transition-colors">Blog</a>
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy">
                  <a className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a>
                </Link>
              </li>
              <li>
                <Link href="/return-policy">
                  <a className="text-muted-foreground hover:text-primary transition-colors">Return Policy</a>
                </Link>
              </li>
              <li>
                <Link href="/track-order">
                  <a className="text-muted-foreground hover:text-primary transition-colors">Track Order</a>
                </Link>
              </li>
              <li>
                <Link href="/contact">
                  <a className="text-muted-foreground hover:text-primary transition-colors">Contact Us</a>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter Subscription */}
        <div className="border-t border-primary/20 mt-8 pt-8">
          <NewsletterForm />
        </div>

        {/* Social Media */}
        <div className="border-t border-primary/20 mt-8 pt-8">
          <div className="flex flex-col items-center gap-4">
            <h3 className="font-semibold text-primary">Follow Us</h3>
            <div className="flex gap-4">
              <a
                href="https://www.facebook.com/profile.php?id=61582679607721"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors glow-box"
                aria-label="Facebook"
              >
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a
                href="https://www.instagram.com/infinitec107hing2024"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors glow-box"
                aria-label="Instagram"
              >
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@infinitec107hing"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors glow-box"
                aria-label="TikTok"
              >
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-primary/20 mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {currentYear} INF!NITE C107HING. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

