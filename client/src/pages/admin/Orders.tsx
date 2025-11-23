import { useState } from 'react';
import AdminLayout from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { Loader2, Eye, Package, Truck, Mail, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminOrders() {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTrackingDialogOpen, setIsTrackingDialogOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingCarrier, setShippingCarrier] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [tapstitchOrderId, setTapstitchOrderId] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: orders, isLoading, refetch } = trpc.orders.getAll.useQuery();
  const updateOrderStatus = trpc.orders.updateStatus.useMutation();
  const addTracking = trpc.orders.addTracking.useMutation();
  const sendStatusEmail = trpc.orders.sendStatusEmail.useMutation();

  const handleStatusChange = async (orderId: number, status: string, sendEmail: boolean = true) => {
    try {
      await updateOrderStatus.mutateAsync({ id: orderId, status: status as any });
      toast.success('Order status updated');
      
      if (sendEmail) {
        try {
          await sendStatusEmail.mutateAsync({ orderId });
          toast.success('Status email sent to customer');
        } catch (emailError) {
          toast.error('Status updated but email failed to send');
        }
      }
      
      refetch();
      if (selectedOrder?.id === orderId) {
        const updatedOrder = orders?.find(o => o.id === orderId);
        if (updatedOrder) {
          setSelectedOrder({ ...updatedOrder, status });
        }
      }
    } catch (error) {
      toast.error('Failed to update order status');
      console.error(error);
    }
  };

  const handleAddTracking = async () => {
    if (!selectedOrder || !trackingNumber || !shippingCarrier) {
      toast.error('Please fill in tracking number and carrier');
      return;
    }

    try {
      await addTracking.mutateAsync({
        orderId: selectedOrder.id,
        trackingNumber,
        shippingCarrier,
        estimatedDelivery: estimatedDelivery || undefined,
        tapstitchOrderId: tapstitchOrderId || undefined,
        internalNotes: internalNotes || undefined,
      });
      
      toast.success('Tracking information added');
      
      // Update status to shipped if not already
      if (selectedOrder.status !== 'shipped' && selectedOrder.status !== 'delivered') {
        await handleStatusChange(selectedOrder.id, 'shipped');
      } else {
        // Send email for tracking update
        try {
          await sendStatusEmail.mutateAsync({ orderId: selectedOrder.id });
          toast.success('Tracking email sent to customer');
        } catch (emailError) {
          toast.error('Tracking added but email failed to send');
        }
      }
      
      refetch();
      setIsTrackingDialogOpen(false);
      resetTrackingForm();
    } catch (error) {
      toast.error('Failed to add tracking information');
      console.error(error);
    }
  };

  const resetTrackingForm = () => {
    setTrackingNumber('');
    setShippingCarrier('');
    setEstimatedDelivery('');
    setTapstitchOrderId('');
    setInternalNotes('');
  };

  const handleViewOrder = (order: any) => {
    setSelectedOrder(order);
    setIsDialogOpen(true);
  };

  const handleOpenTrackingDialog = (order: any) => {
    setSelectedOrder(order);
    setTrackingNumber(order.trackingNumber || '');
    setShippingCarrier(order.shippingCarrier || '');
    setEstimatedDelivery(order.estimatedDelivery ? new Date(order.estimatedDelivery).toISOString().split('T')[0] : '');
    setTapstitchOrderId(order.tapstitchOrderId || '');
    setInternalNotes(order.internalNotes || '');
    setIsTrackingDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-500';
      case 'processing':
        return 'text-blue-500';
      case 'in_production':
        return 'text-purple-500';
      case 'shipped':
        return 'text-cyan-500';
      case 'delivered':
        return 'text-green-500';
      case 'cancelled':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <AlertCircle className="h-4 w-4" />;
      case 'in_production':
        return <Package className="h-4 w-4" />;
      case 'shipped':
        return <Truck className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const canCancelOrder = (order: any) => {
    if (order.status === 'cancelled' || order.status === 'delivered') return false;
    const orderDate = new Date(order.createdAt);
    const now = new Date();
    const hoursSinceOrder = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceOrder <= 24;
  };

  const filteredOrders = orders?.filter(order => {
    if (statusFilter === 'all') return true;
    return order.status === statusFilter;
  }) || [];

  const orderStats = {
    total: orders?.length || 0,
    pending: orders?.filter(o => o.status === 'pending').length || 0,
    processing: orders?.filter(o => o.status === 'processing').length || 0,
    in_production: orders?.filter(o => o.status === 'in_production').length || 0,
    shipped: orders?.filter(o => o.status === 'shipped').length || 0,
    delivered: orders?.filter(o => o.status === 'delivered').length || 0,
    cancelled: orders?.filter(o => o.status === 'cancelled').length || 0,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold glow-text break-words">Order Management</h1>
        </div>

        {/* Order Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold text-primary">{orderStats.total}</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <p className="text-sm text-yellow-500">Pending</p>
              <p className="text-2xl font-bold">{orderStats.pending}</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <p className="text-sm text-blue-500">Processing</p>
              <p className="text-2xl font-bold">{orderStats.processing}</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <p className="text-sm text-purple-500">In Production</p>
              <p className="text-2xl font-bold">{orderStats.in_production}</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <p className="text-sm text-cyan-500">Shipped</p>
              <p className="text-2xl font-bold">{orderStats.shipped}</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <p className="text-sm text-green-500">Delivered</p>
              <p className="text-2xl font-bold">{orderStats.delivered}</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <p className="text-sm text-red-500">Cancelled</p>
              <p className="text-2xl font-bold">{orderStats.cancelled}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="in_production">Production</TabsTrigger>
            <TabsTrigger value="shipped">Shipped</TabsTrigger>
            <TabsTrigger value="delivered">Delivered</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="border-primary/20">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Order Number</p>
                      <p className="font-semibold text-primary">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(order.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="font-semibold">{order.customerName}</p>
                      <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-semibold text-lg">£{(order.total / 100).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Status</p>
                      <div className="flex items-center gap-2">
                        <span className={getStatusColor(order.status)}>
                          {getStatusIcon(order.status)}
                        </span>
                        <Select
                          value={order.status}
                          onValueChange={(value) => handleStatusChange(order.id, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="in_production">In Production</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      {order.trackingNumber ? (
                        <div>
                          <p className="text-sm text-muted-foreground">Tracking</p>
                          <p className="text-xs font-mono text-primary">{order.trackingNumber}</p>
                          <p className="text-xs text-muted-foreground">{order.shippingCarrier}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No tracking info</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewOrder(order)}
                        className="w-full"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleOpenTrackingDialog(order)}
                        className="w-full"
                      >
                        <Truck className="mr-2 h-4 w-4" />
                        Tracking
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-primary/20">
            <CardContent className="py-12 text-center">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {statusFilter === 'all' ? 'No orders yet.' : `No ${statusFilter} orders.`}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Order Details Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Order Number</p>
                    <p className="font-semibold text-primary">{selectedOrder.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="flex items-center gap-2">
                      <span className={getStatusColor(selectedOrder.status)}>
                        {getStatusIcon(selectedOrder.status)}
                      </span>
                      <p className={`font-semibold capitalize ${getStatusColor(selectedOrder.status)}`}>
                        {selectedOrder.status.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Order Date</p>
                    <p className="font-semibold">
                      {new Date(selectedOrder.createdAt).toLocaleDateString('en-GB', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Can Cancel?</p>
                    <p className={`font-semibold ${canCancelOrder(selectedOrder) ? 'text-green-500' : 'text-red-500'}`}>
                      {canCancelOrder(selectedOrder) ? 'Yes (within 24h)' : 'No'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Customer Name</p>
                    <p className="font-semibold">{selectedOrder.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-semibold">{selectedOrder.customerEmail}</p>
                  </div>
                  {selectedOrder.customerPhone && (
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-semibold">{selectedOrder.customerPhone}</p>
                    </div>
                  )}
                </div>

                {/* Tracking Information */}
                {(selectedOrder.trackingNumber || selectedOrder.tapstitchOrderId) && (
                  <div>
                    <h3 className="font-semibold mb-2 text-primary">Tracking Information</h3>
                    <div className="bg-card/50 p-4 rounded border border-primary/20 space-y-2">
                      {selectedOrder.trackingNumber && (
                        <div>
                          <p className="text-sm text-muted-foreground">Tracking Number</p>
                          <p className="font-mono text-primary">{selectedOrder.trackingNumber}</p>
                        </div>
                      )}
                      {selectedOrder.shippingCarrier && (
                        <div>
                          <p className="text-sm text-muted-foreground">Carrier</p>
                          <p className="font-semibold">{selectedOrder.shippingCarrier}</p>
                        </div>
                      )}
                      {selectedOrder.estimatedDelivery && (
                        <div>
                          <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                          <p className="font-semibold">
                            {new Date(selectedOrder.estimatedDelivery).toLocaleDateString('en-GB', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      )}
                      {selectedOrder.tapstitchOrderId && (
                        <div>
                          <p className="text-sm text-muted-foreground">Tapstitch Order ID</p>
                          <p className="font-mono text-xs">{selectedOrder.tapstitchOrderId}</p>
                        </div>
                      )}
                      {selectedOrder.internalNotes && (
                        <div>
                          <p className="text-sm text-muted-foreground">Internal Notes</p>
                          <p className="text-sm">{selectedOrder.internalNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2 text-primary">Shipping Address</h3>
                  <div className="bg-card/50 p-4 rounded border border-primary/20">
                    <p>{selectedOrder.shippingAddress.line1}</p>
                    {selectedOrder.shippingAddress.line2 && <p>{selectedOrder.shippingAddress.line2}</p>}
                    <p>
                      {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}{' '}
                      {selectedOrder.shippingAddress.postalCode}
                    </p>
                    <p>{selectedOrder.shippingAddress.country}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 text-primary">Order Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between items-center bg-card/50 p-3 rounded border border-primary/20"
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
                </div>

                <div className="border-t border-primary/20 pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>£{(selectedOrder.subtotal / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span>£{(selectedOrder.shipping / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>£{(selectedOrder.tax / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-primary border-t border-primary/20 pt-2">
                      <span>Total</span>
                      <span>£{(selectedOrder.total / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {selectedOrder.paymentIntentId && (
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Intent ID</p>
                    <p className="text-xs font-mono">{selectedOrder.paymentIntentId}</p>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="flex gap-2 pt-4 border-t border-primary/20">
                  <Button
                    variant="outline"
                    onClick={() => handleOpenTrackingDialog(selectedOrder)}
                    className="flex-1"
                  >
                    <Truck className="mr-2 h-4 w-4" />
                    Update Tracking
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        await sendStatusEmail.mutateAsync({ orderId: selectedOrder.id });
                        toast.success('Status email sent to customer');
                      } catch (error) {
                        toast.error('Failed to send email');
                      }
                    }}
                    className="flex-1"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Send Status Email
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Tracking Information Dialog */}
        <Dialog open={isTrackingDialogOpen} onOpenChange={setIsTrackingDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Update Tracking Information</DialogTitle>
              <DialogDescription>
                Add or update tracking details for order {selectedOrder?.orderNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trackingNumber">Tracking Number *</Label>
                  <Input
                    id="trackingNumber"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="e.g., 1Z999AA10123456784"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shippingCarrier">Shipping Carrier *</Label>
                  <Select value={shippingCarrier} onValueChange={setShippingCarrier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select carrier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Royal Mail">Royal Mail</SelectItem>
                      <SelectItem value="DPD">DPD</SelectItem>
                      <SelectItem value="Evri">Evri</SelectItem>
                      <SelectItem value="UPS">UPS</SelectItem>
                      <SelectItem value="DHL">DHL</SelectItem>
                      <SelectItem value="FedEx">FedEx</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimatedDelivery">Estimated Delivery</Label>
                  <Input
                    id="estimatedDelivery"
                    type="date"
                    value={estimatedDelivery}
                    onChange={(e) => setEstimatedDelivery(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tapstitchOrderId">Tapstitch Order ID</Label>
                  <Input
                    id="tapstitchOrderId"
                    value={tapstitchOrderId}
                    onChange={(e) => setTapstitchOrderId(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="internalNotes">Internal Notes</Label>
                <Textarea
                  id="internalNotes"
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Add any internal notes about this order (not visible to customer)"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTrackingDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTracking} disabled={!trackingNumber || !shippingCarrier}>
                <Truck className="mr-2 h-4 w-4" />
                Save & Notify Customer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
