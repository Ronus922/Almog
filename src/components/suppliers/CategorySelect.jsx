import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function CategorySelect({ value, onChange, onCategoryCreated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ['supplier-categories'],
    queryFn: () => base44.entities.SupplierCategory.list(),
  });

  const createCategoryMutation = useMutation({
    mutationFn: (name) => base44.entities.SupplierCategory.create({ name, is_active: true }),
    onSuccess: (newCategory) => {
      onChange(newCategory.id);
      onCategoryCreated?.();
      setSearchInput('');
    },
  });

  const activeCats = useMemo(() => {
    if (!Array.isArray(categories)) return [];
    return categories.filter(c => c.is_active);
  }, [categories]);

  const matchedCats = useMemo(() => {
    if (!searchInput.trim()) return activeCats;
    const q = searchInput.toLowerCase();
    return activeCats.filter(c => c.name.toLowerCase().includes(q));
  }, [activeCats, searchInput]);

  const categoryExists = activeCats.some(c => c.name.toLowerCase() === searchInput.toLowerCase());

  const handleCreateNew = async () => {
    if (searchInput.trim() && !categoryExists) {
      createCategoryMutation.mutate(searchInput.trim());
    }
  };

  const selectedCat = activeCats.find(c => c.id === value);

  return (
    <div dir="rtl" className="w-full">
      <Select value={value || ''} onOpenChange={setIsOpen}>
        <SelectTrigger className="h-9 text-right border border-slate-200 rounded-lg">
          <SelectValue placeholder="בחר קטגוריה" />
        </SelectTrigger>
        {isOpen && (
          <SelectContent className="w-full">
            {matchedCats.map(cat => (
              <SelectItem key={cat.id} value={cat.id} className="text-right">
                {cat.name}
              </SelectItem>
            ))}
            {searchInput.trim() && !categoryExists && (
              <div className="p-2 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCreateNew}
                  disabled={createCategoryMutation.isPending}
                  className="w-full text-right text-xs"
                >
                  {createCategoryMutation.isPending ? 'יוצר...' : `צור קטגוריה חדשה: ${searchInput}`}
                </Button>
              </div>
            )}
          </SelectContent>
        )}
      </Select>
      <input
        type="text"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="חפש או הזן קטגוריה חדשה"
        className="hidden"
      />
      {/* Simple searchable dropdown overlay */}
      {isOpen && (
        <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-50 text-right p-2">
          <input
            autoFocus
            type="text"
            placeholder="חפש או הזן קטגוריה"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full h-8 px-3 border border-slate-200 rounded text-sm mb-2 text-right"
            dir="rtl"
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {matchedCats.length === 0 && !searchInput.trim() && (
              <div className="text-slate-500 text-sm p-2">אין קטגוריות</div>
            )}
            {matchedCats.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  onChange(cat.id);
                  setIsOpen(false);
                  setSearchInput('');
                }}
                className={`w-full text-right px-3 py-2 rounded text-sm hover:bg-blue-50 transition ${
                  value === cat.id ? 'bg-blue-100 font-semibold' : ''
                }`}
              >
                {cat.name}
              </button>
            ))}
            {searchInput.trim() && !categoryExists && (
              <button
                onClick={handleCreateNew}
                disabled={createCategoryMutation.isPending}
                className="w-full text-right px-3 py-2 rounded text-sm bg-green-50 hover:bg-green-100 transition text-green-700 font-semibold"
              >
                {createCategoryMutation.isPending ? 'יוצר...' : `צור: ${searchInput}`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}