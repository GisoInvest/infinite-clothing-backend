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
  DialogTrigger,
} from '@/components/ui/dialog';
import { trpc } from '@/lib/trpc';
import { Plus, Pencil, Trash2, Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminProducts() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: 'men',
    subcategory: '',
    images: '',
    videos: '',
    featured: false,
    sizes: [] as string[],
    discount: '0',
      colors: [] as string[],

  });
  const [colorInput, setColorInput] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { data: products, isLoading, refetch } = trpc.products.getAll.useQuery({});
  const createProduct = trpc.products.create.useMutation();
  const updateProduct = trpc.products.update.useMutation();
  const deleteProduct = trpc.products.delete.useMutation();
  const uploadImage = trpc.products.uploadImage.useMutation();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate files
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name}: Invalid file type. Please use JPG, PNG, WEBP, or GIF`);
        return false;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: File size must be less than 5MB`);
        return false;
      }
      
      return true;
    });

    setSelectedImages(prev => [...prev, ...validFiles]);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsUploading(true);
      let imageUrls: string[] = [];

      // Upload selected image files
      if (selectedImages.length > 0) {
        for (const file of selectedImages) {
          const reader = new FileReader();
          const fileData = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const uploadResult = await uploadImage.mutateAsync({
            fileName: file.name,
            fileData: fileData,
            contentType: file.type,
          });

          imageUrls.push(uploadResult.url);
        }
      }

      // Add manually entered URLs
      if (formData.images) {
        const manualUrls = formData.images.split(',').map(s => s.trim()).filter(Boolean);
        imageUrls = [...imageUrls, ...manualUrls];
      }

      const productData = {
        name: formData.name,
        description: formData.description,
        price: Math.round(parseFloat(formData.price) * 100), // Convert to cents
        stock: parseInt(formData.stock),
        category: formData.category as any,
        subcategory: formData.subcategory,
        images: imageUrls,
        videos: formData.videos ? formData.videos.split(',').map(s => s.trim()) : [],
        featured: formData.featured,
        sizes: formData.sizes,
        discount: parseInt(formData.discount) || 0,
        colors: formData.colors,

      };

      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, ...productData });
        toast.success('Product updated successfully');
      } else {
        await createProduct.mutateAsync(productData);
        toast.success('Product created successfully');
      }
      
      setIsDialogOpen(false);
      resetForm();
      refetch();
    } catch (error) {
      toast.error('Failed to save product');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: (product.price / 100).toString(),
      stock: product.stock.toString(),
      category: product.category,
      subcategory: product.subcategory,
      images: product.images?.join(', ') || '',
      videos: product.videos?.join(', ') || '',
      featured: product.featured,
      sizes: product.sizes || [],
      discount: product.discount?.toString() || '0',
      colors: product.colors || [],

    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await deleteProduct.mutateAsync({ id });
      toast.success('Product deleted successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to delete product');
      console.error(error);
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      stock: '',
      category: 'men',
      subcategory: '',
      images: '',
      videos: '',
      featured: false,
      sizes: [],
      discount: '0',
      colors: [],

    });
    setSelectedImages([]);
    setColorInput('');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold glow-text break-words">Products</h1>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="glow-box">
                <Plus className="mr-2 h-5 w-5" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Price (£) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="stock">Stock *</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="men">Men</SelectItem>
                        <SelectItem value="women">Women</SelectItem>
                        <SelectItem value="unisex">Unisex</SelectItem>
                        <SelectItem value="kids-baby">Kids & Baby</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="subcategory">Subcategory *</Label>
                    <Input
                      id="subcategory"
                      value={formData.subcategory}
                      onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                      placeholder="e.g., T-shirt, Hoodies"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="imageFiles">Upload Product Images</Label>
                  <div className="mt-2">
                    <label
                      htmlFor="imageFiles"
                      className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <div className="text-center">
                        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPG, PNG, WEBP, or GIF (max 5MB each)
                        </p>
                      </div>
                    </label>
                    <input
                      id="imageFiles"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      multiple
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </div>
                  
                  {selectedImages.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium">Selected images:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedImages.map((file, index) => (
                          <div key={index} className="relative group">
                            <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg text-sm">
                              <span className="truncate max-w-[150px]">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="text-destructive hover:text-destructive/80"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-muted" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="images">Image URLs (comma-separated)</Label>
                  <Textarea
                    id="videos"
                    value={formData.videos}
                    onChange={(e) => setFormData({ ...formData, videos: e.target.value })}
                    rows={2}
                    placeholder="e.g., https://youtube.com/video1, https://vimeo.com/video2"
                  />
                </div>



                <div>
                  <Label htmlFor="videos">Video URLs (comma-separated)</Label>
                  <Textarea
                    id="videos"
                    value={formData.videos}
                    onChange={(e) => setFormData({ ...formData, videos: e.target.value })}
                    placeholder="https://example.com/video1.mp4"
                    rows={2}
                  />
                </div>

                {/* Size Selector */}
                <div>
                  <Label>Available Sizes</Label>
                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {['S', 'M', 'L', 'XL', '2XL'].map((size) => (
                      <div key={size} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`size-${size}`}
                          checked={formData.sizes.includes(size)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, sizes: [...formData.sizes, size] });
                            } else {
                              setFormData({ ...formData, sizes: formData.sizes.filter(s => s !== size) });
                            }
                          }}
                          className="rounded"
                        />
                        <Label htmlFor={`size-${size}`} className="cursor-pointer">{size}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Discount Field */}
                <div>
                  <Label htmlFor="discount">Discount (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Enter 0 for no discount, or 1-100 for percentage off</p>
                </div>

                {/* Color Field */}
                <div>
                  <Label htmlFor="colors">Available Colors</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="colorInput"
                      value={colorInput}
                      onChange={(e) => setColorInput(e.target.value)}
                      placeholder="Enter color name (e.g., Black, White, Red)"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (colorInput.trim()) {
                            // Split by comma and add each color separately
                            const newColors = colorInput.split(',').map(c => c.trim()).filter(c => c && !formData.colors.includes(c));
                            if (newColors.length > 0) {
                              setFormData({ ...formData, colors: [...formData.colors, ...newColors] });
                              setColorInput('');
                            }
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (colorInput.trim()) {
                          // Split by comma and add each color separately
                          const newColors = colorInput.split(',').map(c => c.trim()).filter(c => c && !formData.colors.includes(c));
                          if (newColors.length > 0) {
                            setFormData({ ...formData, colors: [...formData.colors, ...newColors] });
                            setColorInput('');
                          }
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  {formData.colors.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {formData.colors.map((color, index) => (
                        <div key={index} className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-sm">
                          <span>{color}</span>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, colors: formData.colors.filter((_, i) => i !== index) })}
                            className="text-destructive hover:text-destructive/80"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="featured">Featured Product</Label>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="submit" className="flex-1" disabled={isUploading || createProduct.isPending || updateProduct.isPending}>
                    {(isUploading || createProduct.isPending || updateProduct.isPending) ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {isUploading ? 'Uploading...' : 'Saving...'}</>
                    ) : (
                      editingProduct ? 'Update Product' : 'Create Product'
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="border-primary/20">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded">
                      ID: {product.id}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {product.category} • {product.subcategory}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {product.images && product.images.length > 0 && (
                    <img 
                      src={product.images[0]} 
                      alt={product.name}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex justify-between text-sm">
                    <span>Price: <strong className="text-primary">£{(product.price / 100).toFixed(2)}</strong></span>
                    <span>Stock: <strong>{product.stock}</strong></span>
                  </div>
                  {product.featured && (
                    <span className="inline-block px-2 py-1 text-xs bg-primary/20 text-primary rounded">
                      Featured
                    </span>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(product)} className="flex-1">
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(product.id)}
                      disabled={deleteProduct.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-primary/20">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No products yet. Add your first product to get started!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

