import { useState } from 'react';
import AdminLayout from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminOutfits() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOutfit, setEditingOutfit] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    productIds: [] as number[],
    totalPrice: '',
    isActive: true,
    displayOrder: '0',
  });
  const [productIdInput, setProductIdInput] = useState('');

  const { data: outfits, isLoading, refetch } = trpc.outfits.getAll.useQuery();
  const { data: products } = trpc.products.getAll.useQuery({});
  const createOutfit = trpc.outfits.create.useMutation();
  const updateOutfit = trpc.outfits.update.useMutation();
  const deleteOutfit = trpc.outfits.delete.useMutation();

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      image: '',
      productIds: [],
      totalPrice: '',
      isActive: true,
      displayOrder: '0',
    });
    setProductIdInput('');
    setEditingOutfit(null);
  };

  const handleEdit = (outfit: any) => {
    setEditingOutfit(outfit);
    setFormData({
      name: outfit.name,
      description: outfit.description || '',
      image: outfit.image || '',
      productIds: outfit.productIds || [],
      totalPrice: (outfit.totalPrice / 100).toString(),
      isActive: outfit.isActive,
      displayOrder: outfit.displayOrder?.toString() || '0',
    });
    setIsDialogOpen(true);
  };

  const handleAddProductId = () => {
    const id = parseInt(productIdInput);
    if (!isNaN(id) && !formData.productIds.includes(id)) {
      setFormData(prev => ({
        ...prev,
        productIds: [...prev.productIds, id],
      }));
      setProductIdInput('');
    }
  };

  const handleRemoveProductId = (id: number) => {
    setFormData(prev => ({
      ...prev,
      productIds: prev.productIds.filter(pid => pid !== id),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || formData.productIds.length === 0 || !formData.totalPrice) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const data = {
        name: formData.name,
        description: formData.description || undefined,
        image: formData.image || undefined,
        productIds: formData.productIds,
        totalPrice: Math.round(parseFloat(formData.totalPrice) * 100),
        isActive: formData.isActive,
        displayOrder: parseInt(formData.displayOrder) || 0,
      };

      if (editingOutfit) {
        await updateOutfit.mutateAsync({
          id: editingOutfit.id,
          ...data,
        });
        toast.success('Outfit updated successfully');
      } else {
        await createOutfit.mutateAsync(data);
        toast.success('Outfit created successfully');
      }

      refetch();
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save outfit');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this outfit?')) return;

    try {
      await deleteOutfit.mutateAsync({ id });
      toast.success('Outfit deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete outfit');
    }
  };

  const getProductName = (productId: number) => {
    const product = products?.find(p => p.id === productId);
    return product?.name || `Product #${productId}`;
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Shop The Look</h1>
            <p className="text-muted-foreground">Manage outfit collections</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                New Outfit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingOutfit ? 'Edit Outfit' : 'Create New Outfit'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Outfit Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Urban Street Style"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the outfit style..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="image">Image URL *</Label>
                  <Input
                    id="image"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="/outfits/outfit-image.png"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use relative path (e.g., /outfits/image.png) or full URL
                  </p>
                </div>

                <div>
                  <Label>Product IDs *</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      type="number"
                      value={productIdInput}
                      onChange={(e) => setProductIdInput(e.target.value)}
                      placeholder="Enter product ID"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddProductId();
                        }
                      }}
                    />
                    <Button type="button" onClick={handleAddProductId} variant="outline">
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.productIds.map(id => (
                      <div key={id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{getProductName(id)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveProductId(id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {formData.productIds.length === 0 && (
                      <p className="text-sm text-muted-foreground">No products added yet</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="totalPrice">Total Price (£) *</Label>
                  <Input
                    id="totalPrice"
                    type="number"
                    step="0.01"
                    value={formData.totalPrice}
                    onChange={(e) => setFormData({ ...formData, totalPrice: e.target.value })}
                    placeholder="49.99"
                    required
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="displayOrder">Display Order</Label>
                    <Input
                      id="displayOrder"
                      type="number"
                      value={formData.displayOrder}
                      onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="isActive">Active</Label>
                    <Select
                      value={formData.isActive.toString()}
                      onValueChange={(value) => setFormData({ ...formData, isActive: value === 'true' })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingOutfit ? 'Update' : 'Create'} Outfit
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {outfits && outfits.length > 0 ? (
            outfits.map((outfit) => (
              <Card key={outfit.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {outfit.image && (
                        <img
                          src={outfit.image}
                          alt={outfit.name}
                          className="w-20 h-20 object-cover rounded"
                        />
                      )}
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {outfit.name}
                          {outfit.isActive ? (
                            <Eye className="h-4 w-4 text-green-500" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {outfit.description || 'No description'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(outfit)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(outfit.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Products</p>
                      <div className="space-y-1 mt-1">
                        {outfit.productIds.map((id: number) => (
                          <p key={id}>• {getProductName(id)}</p>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Price</p>
                      <p className="text-2xl font-bold text-primary">
                        £{(outfit.totalPrice / 100).toFixed(2)}
                      </p>
                      <p className="text-muted-foreground mt-2">Display Order: {outfit.displayOrder}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No outfits created yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Click "New Outfit" to create your first outfit collection
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
