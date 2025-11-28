import React from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Ruler } from 'lucide-react';

interface SizeGuideProps {
  productId: number;
}

const SizeGuide: React.FC<SizeGuideProps> = ({ productId }) => {
  const { data: sizeGuide, isLoading } = trpc.products.getSizeGuide.useQuery({ id: productId });

  const hasSizeGuide = sizeGuide && Object.keys(sizeGuide).length > 0;

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading Guide
      </Button>
    );
  }

  if (!hasSizeGuide) {
    return (
      <Button variant="outline" size="sm" disabled>
        No Size Guide Available
      </Button>
    );
  }

  // Extract headers from the first size entry
  const firstSizeKey = Object.keys(sizeGuide)[0];
  const firstSizeValue = sizeGuide[firstSizeKey];
  const headers = firstSizeValue.split(',').map(s => s.split(':')[0].trim());

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="glow-border">
          <Ruler className="mr-2 h-4 w-4" />
          View Size Guide
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Size Guide</DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Size</TableHead>
                {headers.map((header, index) => (
                  <TableHead key={index}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(sizeGuide).map(([size, measurements]) => {
                const values = measurements.split(',').map(s => s.split(':')[1].trim());
                return (
                  <TableRow key={size}>
                    <TableCell className="font-medium">{size}</TableCell>
                    {values.map((value, index) => (
                      <TableCell key={index}>{value}</TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          All measurements are approximate and in inches.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default SizeGuide;
