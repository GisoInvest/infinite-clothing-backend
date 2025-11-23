import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc';
import { Loader2, Package, Truck, CheckCircle2, Clock, AlertCircle, XCircle, Search } from 'lucide-react';
import { toast } from 'sonner';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';

export default function TrackOrder() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);

  const trackOrder = trpc.orders.getByTrackingNumber.useMutation();

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderNumber || !email) {
      toast.error('Please enter both order number and email');
      return;
    }

    setIsSearching(true);
    try {
      const result = await trackOrder.mutateAsync({
        orderNumber: orderNumber.trim(),
        email: email.trim().toLowerCase(),
      });
      
      if (result) {
        setOrderData(result);
      } else {
        toast.error('Order not found. Please check your order number and email.');
        setOrderData(null);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to track order. Please try again.');
      setOrderData(null);
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="h-12 w-12 text-yellow-500" />,
          title: 'Order Received',
          description: 'We\'ve received your order and will begin processing it shortly.',
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
        };
      case 'processing':
        return {
          icon: <AlertCircle className="h-12 w-12 text-blue-500" />,
          title: 'Processing',
          description: 'Your order is being prepared for production.',
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
        };
      case 'in_production':
        return {
          icon: <Package className="h-12 w-12 text-purple-500" />,
          title: 'In Production',
          description: 'Your custom items are being produced. This usually takes 2-5 business days.',
          color: 'text-purple-500',
          bgColor: 'bg-purple-500/10',
        };
      case 'shipped':
        return {
          icon: <Truck className="h-12 w-12 text-cyan-500" />,
          title: 'Shipped',
          description: 'Your order is on its way!',
          color: 'text-cyan-500',
          bgColor: 'bg-cyan-500/10',
        };
      case 'delivered':
        return {
          icon: <CheckCircle2 className="h-12 w-12 text-green-500" />,
          title: 'Delivered',
          description: 'Your order has been delivered. Enjoy your new gear!',
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
        };
      case 'cancelled':
        return {
          icon: <XCircle className="h-12 w-12 text-red-500" />,
          title: 'Cancelled',
          description: 'This order has been cancelled.',
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
        };
      default:
        return {
          icon: <Package className="h-12 w-12 text-muted-foreground" />,
          title: 'Order Status',
          description: 'Your order status',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/10',
        };
    }
  };

  const getProgressPercentage = (status: string) => {
    switch (status) {
      case 'pending':
        return 20;
      case 'processing':
        return 40;
      case 'in_production':
        return 60;
      case 'shipped':
        return 80;
      case 'delivered':
        return 100;
      case 'cancelled':
        return 0;
      default:
        return 0;
    }
  };

  const canCancelOrder = (order: any) => {
    if (order.status === 'cancelled' || order.status === 'delivered') return false;
    const orderDate = new Date(order.createdAt);
    const now = new Date();
    const hoursSinceOrder = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceOrder <= 24;
  };

  const cancelOrder = trpc.orders.cancelOrder.useMutation();

  const handleCancelOrder = async () => {
    if (!orderData) return;

    if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      return;
    }

    try {
      await cancelOrder.mutateAsync({
        orderNumber: orderData.orderNumber,
        email: orderData.customerEmail,
      });
      
      toast.success('Order cancelled successfully. You will receive a refund within 5-7 business days.');
      
      // Refresh order data
      const result = await trackOrder.mutateAsync({
        orderNumber: orderData.orderNumber,
        email: orderData.customerEmail,
      });
      setOrderData(result);
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel order. Please contact support.');
    }
  };

  const statusInfo = orderData ? getStatusInfo(orderData.status) : null;
  const progressPercentage = orderData ? getProgressPercentage(orderData.status) : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Track Your Order"
        description="Track your INF!NITE C107HING order status and delivery information."
      />
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-12 mt-20">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold glow-text">Track Your Order</h1>
            <p className="text-muted-foreground text-lg">
              Enter your order details to check the status of your delivery
            </p>
          </div>

          {/* Search Form */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
              <CardDescription>
                You can find your order number in the confirmation email we sent you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTrackOrder} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="orderNumber">Order Number</Label>
                    <Input
                      id="orderNumber"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="e.g., INF-1234567890"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isSearching}>
                  {isSearching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Track Order
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Order Status Display */}
          {orderData && statusInfo && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Status Header */}
              <Card className={`border-primary/20 ${statusInfo.bgColor}`}>
                <CardContent className="p-8">
                  <div className="flex flex-col items-center text-center space-y-4">
                    {statusInfo.icon}
                    <div>
                      <h2 className={`text-2xl font-bold ${statusInfo.color}`}>{statusInfo.title}</h2>
                      <p className="text-muted-foreground mt-2">{statusInfo.description}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {orderData.status !== 'cancelled' && (
                    <div className="mt-6">
                      <div className="w-full bg-muted rounded-full h-3">
                        <div
                          className="bg-primary h-3 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>Order Placed</span>
                        <span>Processing</span>
                        <span>Production</span>
                        <span>Shipped</span>
                        <span>Delivered</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle>Order Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Order Number</p>
                      <p className="font-semibold text-primary">{orderData.orderNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Order Date</p>
                      <p className="font-semibold">
                        {new Date(orderData.createdAt).toLocaleDateString('en-GB', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="font-semibold text-lg">£{(orderData.total / 100).toFixed(2)}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Tracking Information */}
                {orderData.trackingNumber ? (
                  <Card className="border-primary/20">
                    <CardHeader>
                      <CardTitle>Tracking Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Carrier</p>
                        <p className="font-semibold">{orderData.shippingCarrier}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Tracking Number</p>
                        <p className="font-mono text-sm text-primary break-all">{orderData.trackingNumber}</p>
                      </div>
                      {orderData.estimatedDelivery && (
                        <div>
                          <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                          <p className="font-semibold">
                            {new Date(orderData.estimatedDelivery).toLocaleDateString('en-GB', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-primary/20">
                    <CardHeader>
                      <CardTitle>Tracking Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Tracking information will be available once your order ships. We'll send you an email with tracking details.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Shipping Address */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle>Shipping Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p>{orderData.shippingAddress.line1}</p>
                    {orderData.shippingAddress.line2 && <p>{orderData.shippingAddress.line2}</p>}
                    <p>
                      {orderData.shippingAddress.city}, {orderData.shippingAddress.state}{' '}
                      {orderData.shippingAddress.postalCode}
                    </p>
                    <p>{orderData.shippingAddress.country}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle>Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {orderData.items.map((item: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between items-center pb-3 border-b border-primary/10 last:border-0"
                      >
                        <div>
                          <p className="font-semibold">{item.productName}</p>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {item.quantity} × £{(item.price / 100).toFixed(2)}
                          </p>
                        </div>
                        <p className="font-semibold">£{((item.price * item.quantity) / 100).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-primary/20 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>£{(orderData.subtotal / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Shipping</span>
                      <span>£{(orderData.shipping / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax</span>
                      <span>£{(orderData.tax / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-primary pt-2 border-t border-primary/20">
                      <span>Total</span>
                      <span>£{(orderData.total / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cancel Order Button */}
              {canCancelOrder(orderData) && (
                <Card className="border-red-500/20 bg-red-500/5">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h3 className="font-semibold text-red-500">Need to cancel?</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          You can cancel your order within 24 hours of placement. After that, it will be sent to production.
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={handleCancelOrder}
                        disabled={cancelOrder.isLoading}
                      >
                        {cancelOrder.isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          'Cancel Order'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Help Section */}
              <Card className="border-primary/20">
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground mb-4">
                    Need help with your order? We're here for you!
                  </p>
                  <Button variant="outline" asChild>
                    <a href="mailto:support@infiniteclothingstore.co.uk">
                      Contact Support
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
