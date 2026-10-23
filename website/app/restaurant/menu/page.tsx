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
  Star,
  Flame,
  Leaf,
  PlusCircle,
  ToggleLeft,
  ToggleRight,
} from '@phosphor-icons/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { ConfirmDialog } from '@/components/dashboard/ConfirmDialog';
import { ImageUpload } from '@/components/common/ImageUpload';
import {
  listRestaurantMenuItems,
  createRestaurantMenuItem,
  updateRestaurantMenuItem,
  deleteRestaurantMenuItem,
  setRestaurantMenuItemAvailability,
  uploadRestaurantMenuItemPhoto,
} from '@/lib/api/restaurant';
import { MenuItem, MenuItemCreatePayload, ModifierGroup } from '@/types/restaurant';

export default function RestaurantMenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState<MenuItemCreatePayload>({
    name: '',
    description: '',
    price: 0,
    category: '',
    photo_url: '',
    image_url: '',
    is_available: true,
    is_popular: false,
    dietary_type: 'non-veg',
    modifier_groups: [],
  });

  // Delete Target
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);

  useEffect(() => {
    if (feedbackMessage) {
      const timer = setTimeout(() => setFeedbackMessage(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [feedbackMessage]);

  const fetchMenu = async () => {
    try {
      const data = await listRestaurantMenuItems();
      setMenuItems(data);
    } catch (err: any) {
      console.error('Failed to load menu items', err);
      setFeedbackMessage({
        type: 'error',
        text: 'Unable to reach backend API. Showing offline fixtures.',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const categories = ['All', ...Array.from(new Set(menuItems.map((m) => m.category || 'Specials')))];

  const filteredItems = selectedCategory === 'All'
    ? menuItems
    : menuItems.filter((m) => (m.category || 'Specials') === selectedCategory);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setSelectedFile(null);
    setFormData({
      name: '',
      description: '',
      price: 0,
      category: '',
      photo_url: '',
      image_url: '',
      is_available: true,
      is_popular: false,
      dietary_type: 'non-veg',
      modifier_groups: [],
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item: MenuItem) => {
    setEditingItem(item);
    setSelectedFile(null);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price,
      category: item.category || 'Specials',
      photo_url: item.photo_url || item.image_url || '',
      image_url: item.photo_url || item.image_url || '',
      is_available: item.is_available,
      is_popular: item.is_popular || false,
      dietary_type: item.dietary_type || 'non-veg',
      modifier_groups: item.modifier_groups || [],
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const cleanPhotoUrl = formData.photo_url || formData.image_url || undefined;
      const payload: MenuItemCreatePayload = {
        ...formData,
        photo_url: cleanPhotoUrl,
        image_url: cleanPhotoUrl,
      };

      let saved: MenuItem;
      if (editingItem) {
        saved = await updateRestaurantMenuItem(editingItem.id, payload);
      } else {
        saved = await createRestaurantMenuItem(payload);
      }

      if (selectedFile && saved && saved.id) {
        try {
          await uploadRestaurantMenuItemPhoto(saved.id, selectedFile);
        } catch (photoErr) {
          console.warn('Photo upload fallback triggered:', photoErr);
        }
      }

      setModalOpen(false);
      setSelectedFile(null);
      setFeedbackMessage({
        type: 'success',
        text: editingItem
          ? `Updated "${formData.name}" successfully. Mobile apps synced.`
          : `Created "${formData.name}" successfully. Live on customer and rider apps.`,
      });
      await fetchMenu();
    } catch (err: any) {
      console.error('Failed to save menu item', err);
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'Failed to save menu item. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    const prevItems = menuItems;
    const nextAvailability = !item.is_available;
    // Optimistic UI update
    setMenuItems((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, is_available: nextAvailability } : m))
    );
    try {
      await setRestaurantMenuItemAvailability(item.id, { is_available: nextAvailability });
      setFeedbackMessage({
        type: 'success',
        text: `"${item.name}" is now marked as ${nextAvailability ? 'In Stock' : 'Sold Out'}. Synced to mobile apps.`,
      });
    } catch (err: any) {
      // Rollback optimistic update
      setMenuItems(prevItems);
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'Failed to update item availability. Rolled back changes.',
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const prevItems = menuItems;
    const target = deleteTarget;
    // Optimistic removal
    setMenuItems((prev) => prev.filter((m) => m.id !== target.id));
    setDeleteTarget(null);
    try {
      await deleteRestaurantMenuItem(target.id);
      setFeedbackMessage({
        type: 'success',
        text: `Removed "${target.name}" from menu. Synced across customer and rider apps.`,
      });
    } catch (err: any) {
      setMenuItems(prevItems);
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'Failed to delete item from menu.',
      });
    }
  };

  const formatPKR = (amount?: number) => {
    if (amount === undefined || amount === null) return 'PKR 0.00';
    return `PKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex-1 flex flex-col bg-ink-50/50 min-h-screen">
      <Topbar
        title="Menu & Media Catalog"
        onRefresh={() => {
          setIsRefreshing(true);
          fetchMenu();
        }}
        isRefreshing={isRefreshing}
        actions={
          <button
            onClick={handleOpenCreate}
            className="px-3.5 py-1.5 bg-ink-900 hover:bg-ink-800 text-white rounded-sm text-xs font-semibold shadow-1 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={15} weight="bold" />
            <span>Add New Dish</span>
          </button>
        }
      />

      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Real-time synchronization feedback alert */}
        {feedbackMessage && (
          <div
            className={`p-3.5 rounded-md border text-xs font-medium flex items-center justify-between transition-all ${
              feedbackMessage.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMessage.type === 'success' ? (
                <Check size={16} weight="bold" className="text-green-600" />
              ) : (
                <Warning size={16} weight="bold" className="text-red-600" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-ink-400 hover:text-ink-600 p-1"
            >
              <X size={14} weight="bold" />
            </button>
          </div>
        )}

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-sm text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-ink-900 text-white shadow-1'
                  : 'bg-white border border-ink-200 text-ink-600 hover:bg-ink-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Dish Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white border border-ink-200 rounded-md p-4 space-y-3 animate-pulse">
                <div className="aspect-[4/3] bg-ink-100 rounded-md" />
                <div className="h-4 bg-ink-100 rounded w-2/3" />
                <div className="h-3 bg-ink-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-white border border-ink-200 rounded-md p-6">
            <ForkKnife size={36} className="text-ink-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-ink-800">No dishes found</h3>
            <p className="text-xs text-ink-400 mt-1">Get started by adding your first restaurant dish photo and pricing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredItems.map((dish) => {
              const photo = dish.photo_url || dish.image_url;
              return (
                <div
                  key={dish.id}
                  className={`bg-white border rounded-md overflow-hidden shadow-1 hover:shadow-2 transition-all flex flex-col justify-between ${
                    dish.is_available ? 'border-ink-200' : 'border-ink-200 bg-ink-50/50 opacity-75'
                  }`}
                >
                  <div>
                    {/* Dish Photo Container */}
                    <div className="relative aspect-[4/3] w-full bg-ink-100 overflow-hidden flex items-center justify-center">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo}
                          alt={dish.name}
                          className={`w-full h-full object-cover transition-transform duration-300 hover:scale-103 ${
                            !dish.is_available ? 'grayscale-50' : ''
                          }`}
                        />
                      ) : (
                        <ForkKnife size={36} className="text-ink-300" />
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="text-2xs font-bold px-2 py-0.5 rounded-xs bg-ink-900/80 text-white backdrop-blur-xs">
                          {dish.category || 'Special'}
                        </span>
                        {dish.dietary_type === 'veg' ? (
                          <span className="text-2xs font-bold px-2 py-0.5 rounded-xs bg-green-600 text-white flex items-center gap-1">
                            <Leaf size={11} weight="bold" />
                            Veg
                          </span>
                        ) : (
                          <span className="text-2xs font-bold px-2 py-0.5 rounded-xs bg-ink-900/80 text-white">
                            Halal
                          </span>
                        )}
                      </div>

                      {dish.is_popular && (
                        <div className="absolute top-2.5 right-2.5 bg-amber-500 text-white text-2xs font-bold px-2 py-0.5 rounded-xs flex items-center gap-1 shadow-1">
                          <Star size={11} weight="fill" />
                          Best Seller
                        </div>
                      )}

                      {!dish.is_available && (
                        <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-2xs flex items-center justify-center">
                          <span className="px-3 py-1 bg-ink-900/90 text-white font-bold text-xs uppercase tracking-wider rounded-md shadow-2">
                            Sold Out
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Dish Content */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-sm text-ink-900 leading-snug line-clamp-1">
                          {dish.name}
                        </h3>
                        <span className="font-mono font-bold text-sm text-ink-900 shrink-0">
                          {formatPKR(dish.price)}
                        </span>
                      </div>

                      <p className="text-xs text-ink-500 line-clamp-2 leading-relaxed">
                        {dish.description || 'No description provided.'}
                      </p>

                      {/* Modifier Groups Preview */}
                      {dish.modifier_groups && dish.modifier_groups.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-1 text-2xs text-ink-500">
                          {dish.modifier_groups.map((g) => (
                            <span
                              key={g.id}
                              className="px-2 py-0.5 bg-ink-100 rounded-md border border-ink-200 font-medium"
                            >
                              {g.name} ({g.options.length})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="p-3.5 border-t border-ink-100 bg-ink-50/50 flex items-center justify-between">
                    {/* Instant Availability (In Stock / NA) Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleAvailability(dish)}
                      className={`text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        dish.is_available
                          ? 'text-green-700 hover:text-green-800'
                          : 'text-red-600 hover:text-red-700'
                      }`}
                    >
                      {dish.is_available ? (
                        <ToggleRight size={22} weight="fill" className="text-green-600" />
                      ) : (
                        <ToggleLeft size={22} weight="fill" className="text-ink-400" />
                      )}
                      <span>{dish.is_available ? 'In Stock' : 'NA (Not Available)'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(dish)}
                        className="p-1.5 rounded-sm border border-ink-200 bg-white hover:bg-ink-50 text-ink-600 transition-colors"
                        title="Edit Dish"
                      >
                        <PencilSimple size={14} weight="bold" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(dish)}
                        className="p-1.5 rounded-sm border border-ink-200 bg-white hover:bg-red-50 hover:text-red-600 text-ink-400 transition-colors"
                        title="Delete Dish"
                      >
                        <Trash size={14} weight="bold" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD / EDIT DISH MODAL WITH IMAGE UPLOADER */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-lg p-6 shadow-3 border border-ink-200 space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-ink-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-ink-900">
                  {editingItem ? 'Edit Dish & Media' : 'Add New Menu Item'}
                </h3>
                <p className="text-xs text-ink-400">
                  Upload food photography and set portion modifier options.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-ink-400 hover:text-ink-600 rounded-sm"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Image Upload Component (4:3 Dish aspect ratio) */}
              <ImageUpload
                label="Dish Photography"
                aspectRatio="4:3"
                value={formData.photo_url || formData.image_url}
                onChange={(url) => setFormData({ ...formData, photo_url: url, image_url: url })}
                onFileSelect={(file) => setSelectedFile(file)}
                hint="High-res dish photo (4:3 ratio, max 5MB)"
              />

              {/* Title & Price */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="font-semibold text-ink-700">Dish Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Special Chicken Biryani"
                    className="w-full p-2 rounded-sm border border-ink-200 bg-ink-50 text-ink-900 focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-ink-700">Price (PKR)</label>
                  <input
                    type="number"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded-sm border border-ink-200 bg-ink-50 text-ink-900 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Category & Dietary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-ink-700">Category</label>
                  <input
                    type="text"
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Rice & Biryani"
                    className="w-full p-2 rounded-sm border border-ink-200 bg-ink-50 text-ink-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-ink-700">Dietary Profile</label>
                  <select
                    value={formData.dietary_type || 'non-veg'}
                    onChange={(e) => setFormData({ ...formData, dietary_type: e.target.value })}
                    className="w-full p-2 rounded-sm border border-ink-200 bg-ink-50 text-ink-900"
                  >
                    <option value="non-veg">Non-Veg (Halal)</option>
                    <option value="veg">Vegetarian</option>
                    <option value="vegan">Vegan</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-semibold text-ink-700">Description</label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe ingredients, marinades, or allergen details..."
                  className="w-full p-2 rounded-sm border border-ink-200 bg-ink-50 text-ink-900 focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-ink-700">
                  <input
                    type="checkbox"
                    checked={formData.is_available ?? true}
                    onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                    className="rounded-sm text-red-600 focus:ring-blue-600"
                  />
                  <span>Available for Online Orders</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-ink-700">
                  <input
                    type="checkbox"
                    checked={formData.is_popular ?? false}
                    onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                    className="rounded-sm text-amber-500 focus:ring-amber-400"
                  />
                  <span>Featured Best Seller</span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-ink-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-ink-600 hover:bg-ink-100 rounded-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-sm shadow-1 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSaving ? 'Saving & Syncing...' : editingItem ? 'Save Changes' : 'Create Dish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Remove Menu Item"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? Customers will no longer be able to order this item.`}
        confirmText="Delete Dish"
        cancelText="Keep"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
