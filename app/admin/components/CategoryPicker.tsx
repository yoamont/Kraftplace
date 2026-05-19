'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Shirt, Gem, Home, Leaf, Coffee, Baby, Scissors, Palette,
  Sparkles, Watch, Package, Tag, Flower2, Sun, Dumbbell,
  BookOpen, Music, Utensils, PawPrint, Briefcase, Heart,
  ShoppingBag, Apple, Brush, Lamp, Bath, Sofa, Frame,
  Bike, Globe, Layers, type LucideIcon,
} from 'lucide-react';
import type { Category } from '@/lib/supabase';

const ICON_MAP: Record<string, LucideIcon> = {
  Shirt, Gem, Home, Leaf, Coffee, Baby, Scissors, Palette,
  Sparkles, Watch, Package, Tag, Flower2, Sun, Dumbbell,
  BookOpen, Music, Utensils, PawPrint, Briefcase, Heart,
  ShoppingBag, Apple, Brush, Lamp, Bath, Sofa, Frame,
  Bike, Globe, Layers,
};

function CategoryIcon({ icon, className = 'h-3.5 w-3.5' }: { icon: string | null; className?: string }) {
  if (!icon) return <Tag className={className} strokeWidth={1.5} />;
  const LucideComp = ICON_MAP[icon];
  if (LucideComp) return <LucideComp className={className} strokeWidth={1.5} />;
  // Fallback: treat as emoji/text
  return <span className="text-[13px] leading-none" aria-hidden>{icon}</span>;
}

type Props = {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  maxSelection?: number;
};

type GroupedCategories = { groupName: string; categories: Category[] }[];

export function CategoryPicker({ selectedIds, onChange, maxSelection }: Props) {
  const [groups, setGroups] = useState<GroupedCategories>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        const cats = (data as Category[]) ?? [];
        const map = new Map<string, Category[]>();
        for (const cat of cats) {
          if (!map.has(cat.group_name)) map.set(cat.group_name, []);
          map.get(cat.group_name)!.push(cat);
        }
        setGroups(Array.from(map.entries()).map(([groupName, categories]) => ({ groupName, categories })));
        setLoading(false);
      });
  }, []);

  function toggle(id: number) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      if (maxSelection && selectedIds.length >= maxSelection) return;
      onChange([...selectedIds, id]);
    }
  }

  if (loading) return <div className="h-6 w-32 bg-neutral-100 rounded animate-pulse" />;
  if (groups.length === 0) return null;

  const count = selectedIds.length;

  return (
    <div className="space-y-4">
      {maxSelection && (
        <p className="text-xs text-neutral-500">
          {count}/{maxSelection} sélectionnée{count !== 1 ? 's' : ''}
        </p>
      )}
      {groups.map(({ groupName, categories }) => (
        <div key={groupName}>
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">{groupName}</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const selected = selectedIds.includes(cat.id);
              const disabled = !selected && maxSelection != null && count >= maxSelection;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggle(cat.id)}
                  disabled={disabled}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm border transition-colors ${
                    selected
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : disabled
                        ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                  }`}
                >
                  <CategoryIcon icon={cat.icon} className="h-3.5 w-3.5 shrink-0" />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export { CategoryIcon };
