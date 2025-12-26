import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Building2, ChevronDown, Star, Trash2, Edit, Check } from "lucide-react";
import { useBrands } from "@/hooks/useBrands";
import { cn } from "@/lib/utils";

export function BrandManager() {
  const {
    brands,
    activeBrand,
    loading,
    createBrand,
    updateBrand,
    deleteBrand,
    switchBrand,
  } = useBrands();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [editingBrand, setEditingBrand] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) return;
    await createBrand(newBrandName.trim(), isPrimary);
    setNewBrandName("");
    setIsPrimary(false);
    setShowAddDialog(false);
  };

  const handleUpdateBrand = async (id: string) => {
    if (!editName.trim()) return;
    await updateBrand(id, { name: editName.trim() });
    setEditingBrand(null);
    setEditName("");
  };

  const handleSetPrimary = async (id: string) => {
    await updateBrand(id, { is_primary: true });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4 animate-pulse" />
        Loading brands...
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Building2 className="h-4 w-4" />
            {activeBrand?.name || "Select Brand"}
            {activeBrand?.is_primary && (
              <Star className="h-3 w-3 text-warning fill-warning" />
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {brands.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No brands yet. Create your first brand.
            </div>
          ) : (
            <>
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Your Brands
              </div>
              {brands.map((brand) => (
                <DropdownMenuItem
                  key={brand.id}
                  className={cn(
                    "flex items-center justify-between cursor-pointer",
                    activeBrand?.id === brand.id && "bg-secondary"
                  )}
                  onSelect={(e) => {
                    e.preventDefault();
                    switchBrand(brand);
                  }}
                >
                  <div className="flex items-center gap-2">
                    {activeBrand?.id === brand.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                    <span>{brand.name}</span>
                    {brand.is_primary && (
                      <Badge variant="secondary" className="text-xs">
                        Primary
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {!brand.is_primary && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleSetPrimary(brand.id)}
                      >
                        <Star className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setEditingBrand(brand.id);
                        setEditName(brand.name);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => deleteBrand(brand.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Brand
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Add Brand Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Brand</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Brand Name</Label>
              <Input
                placeholder="Enter brand name..."
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateBrand()}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPrimary"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="rounded border-border"
              />
              <Label htmlFor="isPrimary" className="text-sm text-muted-foreground">
                Set as primary brand
              </Label>
            </div>
            <Button onClick={handleCreateBrand} className="w-full">
              Create Brand
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Brand Dialog */}
      <Dialog open={!!editingBrand} onOpenChange={(open) => !open && setEditingBrand(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Brand</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Brand Name</Label>
              <Input
                placeholder="Enter brand name..."
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && editingBrand && handleUpdateBrand(editingBrand)
                }
              />
            </div>
            <Button
              onClick={() => editingBrand && handleUpdateBrand(editingBrand)}
              className="w-full"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
