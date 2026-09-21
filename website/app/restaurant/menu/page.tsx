'use client';

import React, { useEffect, useState } from 'react';
import {
  ForkKnife,
  Plus,
  PencilSimple,
  Trash,
  X,
  Tag,
  Check,
  Warning,
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { ConfirmDialog } from '@/components/dashboard/ConfirmDialog';
import {
  listRestaurantMenuItems,
  createRestaurantMenuItem,
  updateRestaurantMenuItem,
  deleteRestaurantMenuItem,
  setRestaurantMenuItemAvailability,
} from '@/lib/api/restaurant';
import { MenuItem, MenuItemCreatePayload } from '@/types/restaurant';

export default function RestaurantMenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<MenuItemCreatePayload>({
    name: '',
    description: '',
    price: 350,
    category: 'Main Course',
    is_available: true,
  });

  // Delete Target
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);

  const fetchMenu = async () => {
    try {
      const data = await listRestaurantMenuItems();
      setMenuItems(data);
    } catch (err) {
      console.error('Failed to load menu items', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      price: 350,
      category: 'Main Course',
      is_available: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price,
      category: item.category || 'Main Course',
      is_available: item.is_available,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await updateRestaurantMenuItem(editingItem.id, formData);
      } else {
        await createRestaurantMenuItem(formData);
      }
      setModalOpen(false);
      await fetchMenu();
    } catch (err) {
      console.error('Failed to save menu item', err);
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await setRestaurantMenuItemAvailability(item.id, { is_available: !item.is_available });
      await fetchMenu();
    } catch (err) {
      console.error('Failed to toggle availability', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRestaurantMenuItem(deleteTarget.id);
      setDeleteTarget(null);
      await fetchMenu();
    } catch (err) {
      console.error('Failed to delete item', err);
    }
  };

  const formatPKR = (amount: number) => {
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Group items by category
  const categories = Array.from(new Set(menuItems.map((m) => m.category || 'Uncategorized')));

  return (
    <div className="flex-1 flex flex-col">
      <Topbar
        title="Menu & Kitchen Catalog"
        description="Configure menu items, update prices, and toggle in-stock availability."
        onRefresh={() => {
          setIsRefreshing(true);
          fetchMenu();
        }}
        isRefreshing={isRefreshing}
        actions={
          <button
            onClick={handleOpenCreate}
            className="px-3 py-1.5 font-mono text-xs font-semibold bg-red text-paper hover:bg-[#C92A2E] transition-colors flex items-center gap-1.5"
            style={{ borderRadius: '0px' }}
          >
            <Plus size={14} weight="bold" />
            <span>Add Menu Dish</span>
          </button>
        }
      />

      <div className="p-6 space-y-8">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-8 bg-line/40 w-48 animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="h-32 bg-paper border border-line animate-pulse" />
              <div className="h-32 bg-paper border border-line animate-pulse" />
              <div className="h-32 bg-paper border border-line animate-pulse" />
            </div>
          </div>
        ) : menuItems.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-line bg-paper-off/50">
            <ForkKnife size={32} className="mx-auto text-ink-soft mb-2" />
            <p className="font-heading font-semibold text-sm text-ink mb-1">Your Menu is Empty</p>
            <p className="font-sans text-xs text-ink-soft mb-4">Add your first culinary dish to start receiving customer orders.</p>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 font-mono text-xs font-semibold bg-red text-paper hover:bg-[#C92A2E]"
            >
              Add First Dish
            </button>
          </div>
        ) : (
          categories.map((cat) => {
            const itemsInCat = menuItems.filter((m) => (m.category || 'Uncategorized') === cat);
            return (
              <div key={cat} className="space-y-3">
                <div className="flex items-center gap-2 border-b border-line pb-2">
                  <Tag size={16} className="text-red" />
                  <h2 className="font-heading font-bold text-sm text-ink uppercase tracking-wider">
                    {cat} ({itemsInCat.length})
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {itemsInCat.map((item) => (
                    <div
                      key={item.id}
                      className={`bg-paper border p-4 flex flex-col justify-between transition-colors ${
                        item.is_available ? 'border-line' : 'border-line/60 bg-paper-off/40 opacity-75'
                      }`}
                      style={{ borderRadius: '0px' }}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-heading font-bold text-sm text-ink leading-snug">
                            {item.name}
                          </h3>
                          <span className="font-mono font-bold text-sm text-ink shrink-0">
                            {formatPKR(item.price)}
                          </span>
                        </div>

                        {item.description && (
                          <p className="font-sans text-xs text-ink-soft leading-relaxed line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Controls Footer */}
                      <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
                        {/* Stock Toggle */}
                        <button
                          onClick={() => handleToggleAvailability(item)}
                          className={`font-mono text-[11px] font-semibold px-2 py-0.5 border flex items-center gap-1.5 transition-colors ${
                            item.is_available
                              ? 'border-[#BCE4C7] bg-[#EBF7EE] text-[#1E7E34]'
                              : 'border-[#F5C2BC] bg-[#FDF0EE] text-[#C92A2A]'
                          }`}
                          style={{ borderRadius: '0px' }}
                          title="Click to toggle availability"
                        >
                          <span
                            className={`w-1.5 h-1.5 ${item.is_available ? 'bg-[#1E7E34]' : 'bg-[#C92A2A]'}`}
                            style={{ borderRadius: '0px' }}
                          />
                          <span>{item.is_available ? 'In Stock' : 'Sold Out'}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 border border-line bg-paper hover:bg-paper-off text-ink transition-colors"
                            style={{ borderRadius: '0px' }}
                            title="Edit Dish"
                          >
                            <PencilSimple size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="p-1.5 border border-[#F5C2BC] bg-[#FDF0EE] hover:bg-[#FADBD8] text-[#C92A2A] transition-colors"
                            style={{ borderRadius: '0px' }}
                            title="Delete Dish"
                          >
                            <Trash size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Dish Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-[2px]">
          <div className="w-full max-w-md bg-paper border border-line shadow-2xl p-6" style={{ borderRadius: '0px' }}>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-line">
              <div className="flex items-center gap-2">
                <ForkKnife size={18} className="text-red" />
                <h3 className="font-heading font-bold text-base text-ink">
                  {editingItem ? 'Edit Culinary Dish' : 'Add New Menu Dish'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 border border-line hover:bg-paper-off text-ink-soft"
                style={{ borderRadius: '0px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1 font-semibold">
                  Dish Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Chicken Tikka Biryani"
                  className="w-full px-3 py-2 text-sm bg-paper border border-line text-ink focus:outline-none focus:border-ink font-sans"
                  style={{ borderRadius: '0px' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1 font-semibold">
                    Price (PKR) *
                  </label>
                  <input
                    type="number"
                    min="10"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm bg-paper border border-line text-ink focus:outline-none focus:border-ink font-mono"
                    style={{ borderRadius: '0px' }}
                  />
                </div>
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1 font-semibold">
                    Category *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Rice & Biryani"
                    className="w-full px-3 py-2 text-sm bg-paper border border-line text-ink focus:outline-none focus:border-ink font-sans"
                    style={{ borderRadius: '0px' }}
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1 font-semibold">
                  Recipe Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ingredients, preparation details, serving sizes..."
                  className="w-full px-3 py-2 text-xs bg-paper border border-line text-ink focus:outline-none focus:border-ink font-sans"
                  style={{ borderRadius: '0px' }}
                />
              </div>

              <div className="pt-4 border-t border-line flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 font-mono text-xs border border-line bg-paper text-ink hover:bg-paper-off"
                  style={{ borderRadius: '0px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-mono text-xs font-semibold bg-red text-paper hover:bg-[#C92A2E]"
                  style={{ borderRadius: '0px' }}
                >
                  {editingItem ? 'Save Changes' : 'Create Dish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Remove Menu Dish"
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}" from your restaurant menu?`}
        confirmLabel="Confirm Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
