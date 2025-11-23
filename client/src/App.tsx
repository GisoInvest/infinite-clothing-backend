import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CartProvider } from "./contexts/CartContext";
import { WishlistProvider } from "./contexts/WishlistContext";
import Home from "./pages/Home";
import Men from "./pages/Men";
import Women from "./pages/Women";
import Unisex from "./pages/Unisex";
import KidsBaby from "./pages/KidsBaby";
import About from "./pages/About";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import ProductDetail from "./pages/ProductDetail";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ReturnPolicy from "./pages/ReturnPolicy";
import ContactUs from "./pages/ContactUs";
import AudioPlayer from "./components/AudioPlayer";
import AIAssistant from "./components/AIAssistant";
import AdminLogin from "./pages/admin/Login";
import AdminProducts from "./pages/admin/Products";
import AdminOrders from "./pages/admin/Orders";
import AdminAudio from "./pages/admin/Audio";
import AdminSettings from "./pages/AdminSettings";
import AdminBlog from "./pages/admin/Blog";
import AdminEmailCampaigns from "./pages/admin/EmailCampaigns";
import AdminOutfits from "./pages/admin/Outfits";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import BlogCategories from "./pages/BlogCategories";
import Shop from "./pages/Shop";
import Wishlist from "./pages/Wishlist";
import TawkToChat from "./components/TawkToChat";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/men" component={Men} />
      <Route path="/women" component={Women} />
      <Route path="/unisex" component={Unisex} />
      <Route path="/kids-baby" component={KidsBaby} />
      <Route path="/about" component={About} />
      <Route path="/shop" component={Shop} />
      <Route path="/wishlist" component={Wishlist} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/order-confirmation" component={OrderConfirmation} />
      <Route path="/product/:id" component={ProductDetail} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/return-policy" component={ReturnPolicy} />
      <Route path="/contact" component={ContactUs} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/categories" component={BlogCategories} />
      <Route path="/blog/:slug" component={BlogPost} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/products" component={AdminProducts} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/audio" component={AdminAudio} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/blog" component={AdminBlog} />
      <Route path="/admin/email-campaigns" component={AdminEmailCampaigns} />
      <Route path="/admin/outfits" component={AdminOutfits} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <CartProvider>
          <WishlistProvider>
            <TooltipProvider>
            <Toaster />
            <AudioPlayer />
            <AIAssistant />
            <TawkToChat />
            <Router />
            </TooltipProvider>
          </WishlistProvider>
        </CartProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
