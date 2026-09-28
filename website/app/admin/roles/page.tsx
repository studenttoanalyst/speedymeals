'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldWarning,
  Plus,
  PencilSimple,
  Trash,
  Check,
  X,
  Users,
  MagnifyingGlass,
  Sparkle,
  LockKey,
  CheckCircle,
} from '@phosphor-icons/react';
import {
  getPermissions,
  getAdminRoles,
  createAdminRole,
  updateAdminRole,
  deleteAdminRole,
  Permission,
  AdminRole,
} from '@/lib/api/rbac';
import { ROLE_SYMBOLS, getRoleSymbolIcon } from '@/lib/icons/roleSymbols';

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
  const [permissionFilter, setPermissionFilter] = useState<'all' | 'granted' | 'unassigned'>('all');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIcon, setFormIcon] = useState('ShieldCheck');
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Delete modal state
  const [roleToDelete, setRoleToDelete] = useState<AdminRole | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rolesData, permsData] = await Promise.all([
        getAdminRoles(),
        getPermissions(),
      ]);
      setRoles(rolesData);
      setPermissions(permsData);
      if (rolesData.length > 0) {
        setSelectedRole(rolesData[0]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load security roles.');
    } finally {
      setIsLoading(false);
    }
  };

  // Group permissions by operational domain
  const permissionsByDomain = useMemo(() => {
    const map: Record<string, Permission[]> = {};
    permissions.forEach((p) => {
      const d = p.domain || 'platform';
      if (!map[d]) {
        map[d] = [];
      }
      map[d].push(p);
    });
    return map;
  }, [permissions]);

  const domainLabels: Record<string, string> = {
    restaurants: 'Restaurants & Food Partners',
    riders: 'Riders & Deliveries',
    orders: 'Customer Orders & Tracking',
    finance: 'Money, Payouts & Cash Collections',
    customers: 'Customers & Food Reviews',
    marketing: 'Discounts & Special Offers',
    pricing: 'Delivery Charges & Fees',
    analytics: 'Sales Reports & Numbers',
    admins: 'Office Staff Accounts & Roles',
    platform: 'General System Settings',
  };

  const openCreateModal = () => {
    setModalMode('create');
    setFormName('');
    setFormDescription('');
    setFormIcon('ShieldCheck');
    setSelectedPermissionKeys([]);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (role: AdminRole) => {
    if (role.is_system) {
      alert('System roles are protected and cannot be directly modified.');
      return;
    }
    setModalMode('edit');
    setFormName(role.name);
    setFormDescription('');
    setFormIcon(role.icon || 'ShieldCheck');
    setSelectedPermissionKeys(role.permissions.map((p) => p.key));
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleTogglePermission = (key: string) => {
    setSelectedPermissionKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleToggleDomainAll = (domain: string) => {
    const domainPerms = permissionsByDomain[domain] || [];
    const domainKeys = domainPerms.map((p) => p.key);
    const allSelected = domainKeys.every((k) => selectedPermissionKeys.includes(k));

    if (allSelected) {
      setSelectedPermissionKeys((prev) =>
        prev.filter((k) => !domainKeys.includes(k))
      );
    } else {
      setSelectedPermissionKeys((prev) =>
        Array.from(new Set([...prev, ...domainKeys]))
      );
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMessage('Role name is required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (modalMode === 'create') {
        const newRole = await createAdminRole({
          name: formName.trim(),
          icon: formIcon,
          color: '#0F172A',
          permission_keys: selectedPermissionKeys,
        });
        setRoles((prev) => [...prev, newRole]);
        setSelectedRole(newRole);
        setSuccessMessage(`Role "${newRole.name}" created successfully.`);
      } else if (selectedRole) {
        const updatedRole = await updateAdminRole(selectedRole.id, {
          name: formName.trim(),
          icon: formIcon,
          color: '#0F172A',
          permission_keys: selectedPermissionKeys,
        });
        setRoles((prev) =>
          prev.map((r) => (r.id === updatedRole.id ? updatedRole : r))
        );
        setSelectedRole(updatedRole);
        setSuccessMessage(`Role "${updatedRole.name}" updated successfully.`);
      }
      setIsModalOpen(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save role.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    setIsDeleting(true);
    try {
      await deleteAdminRole(roleToDelete.id);
      setRoles((prev) => prev.filter((r) => r.id !== roleToDelete.id));
      if (selectedRole?.id === roleToDelete.id) {
        setSelectedRole(roles[0] || null);
      }
      setSuccessMessage(`Role "${roleToDelete.name}" deleted.`);
      setRoleToDelete(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete role.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return roles;
    const q = searchQuery.toLowerCase();
    return roles.filter((r) => r.name.toLowerCase().includes(q));
  }, [roles, searchQuery]);

  const ActiveFormIconComponent = getRoleSymbolIcon(formIcon);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Staff Roles & Permissions
          </h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 ring-1 ring-rose-200">
            Access Control
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={16} weight="bold" />
            <span>Create New Role</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs font-medium flex items-center justify-between animate-fade-in shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} weight="bold" className="text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Main 2-Column Split: Roles List & Selected Role Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Roles Roster (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative">
            <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search roles..."
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-2xs font-medium"
            />
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="p-8 text-center text-xs font-medium text-slate-500 bg-white border border-slate-200 rounded-2xl">
                Loading roles...
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="p-8 text-center text-xs font-medium text-slate-500 bg-white border border-slate-200 rounded-2xl">
                No roles found.
              </div>
            ) : (
              filteredRoles.map((role) => {
                const isSelected = selectedRole?.id === role.id;
                const RoleIcon = getRoleSymbolIcon(role.icon);

                return (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRole(role)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-slate-50/70 border-slate-900 shadow-sm ring-1 ring-slate-900/10'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Profile Symbol Badge */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          <RoleIcon size={20} weight="bold" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">
                              {role.name}
                            </span>
                            {role.is_system && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                <LockKey size={11} weight="bold" />
                                System
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-medium mt-0.5">
                            {role.permissions.length} allowed actions
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shrink-0">
                        <Users size={13} weight="bold" />
                        <span>{role.admin_count}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Click to inspect</span>
                      <span className={isSelected ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'}>
                        {isSelected ? 'Active Role ✓' : 'View Details →'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Role Permission Scope (7 cols) */}
        <div className="lg:col-span-7">
          {selectedRole ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              {/* Role Header Banner */}
              <div className="p-6 border-b border-slate-200 bg-slate-50/75 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {/* Selected Role Profile Symbol */}
                  {(() => {
                    const SelectedIcon = getRoleSymbolIcon(selectedRole.icon);
                    return (
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <SelectedIcon size={24} weight="bold" />
                      </div>
                    );
                  })()}

                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                        {selectedRole.name}
                      </h2>
                      {selectedRole.is_system ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-full">
                          <LockKey size={12} weight="bold" />
                          System Protected
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Custom Role
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-600 mt-1">
                      {selectedRole.is_system
                        ? 'Standard platform operational role with protected core permissions.'
                        : 'Custom operational profile created by platform administration.'}
                    </p>
                  </div>
                </div>

                {!selectedRole.is_system && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEditModal(selectedRole)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                    >
                      <PencilSimple size={14} weight="bold" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setRoleToDelete(selectedRole)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                    >
                      <Trash size={14} weight="bold" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Permission Scope Summary */}
              {/* Permission Scope Summary with Filter Tabs */}
              <div className="p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-800">
                <div className="flex items-center gap-2 font-medium">
                  <ShieldCheck size={18} weight="bold" className="text-emerald-600" />
                  <span>
                    Allows <strong className="text-slate-900 font-bold">{selectedRole.permissions.length}</strong> of{' '}
                    <strong className="text-slate-900 font-bold">{permissions.length}</strong> system actions
                  </span>
                </div>

                {/* Filter Tabs for Visual Comfort */}
                <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setPermissionFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      permissionFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    All ({permissions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPermissionFilter('granted')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      permissionFilter === 'granted'
                        ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                        : 'text-emerald-700 hover:text-emerald-900'
                    }`}
                  >
                    <Check size={12} weight="bold" />
                    <span>Allowed Only ({selectedRole.permissions.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPermissionFilter('unassigned')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      permissionFilter === 'unassigned'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Not Allowed ({permissions.length - selectedRole.permissions.length})
                  </button>
                </div>
              </div>

              {/* Grouped Permission Details */}
              <div className="p-6 space-y-6 max-h-[680px] overflow-y-auto">
                {/* Non-Native English Friendly Legend - Calmed Design */}
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-2.5 text-xs text-slate-600">
                  <ShieldCheck size={18} weight="bold" className="text-slate-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800">Understanding Permission Levels:</span>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Standard actions let staff view records and do daily work. Actions marked <span className="font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded text-[10px]">Sensitive</span> handle private customer/rider documents or blocking accounts. Actions marked <span className="font-semibold text-rose-800 bg-rose-50 border border-rose-200/80 px-1.5 py-0.5 rounded text-[10px]">High Risk</span> handle real money, fee changes, or password resets.
                    </p>
                  </div>
                </div>

                {(() => {
                  const rolePermKeys = new Set(selectedRole.permissions.map((p) => p.key));
                  const domainEntries = Object.entries(permissionsByDomain);

                  const renderedDomains = domainEntries
                    .map(([domain, domainPerms]) => {
                      const grantedInDomain = domainPerms.filter((p) => rolePermKeys.has(p.key));
                      const filteredPerms = domainPerms.filter((p) => {
                        const isGranted = rolePermKeys.has(p.key);
                        if (permissionFilter === 'granted') return isGranted;
                        if (permissionFilter === 'unassigned') return !isGranted;
                        return true;
                      });

                      if (filteredPerms.length === 0) return null;

                      const noneSelectedInDomain = grantedInDomain.length === 0;

                      return (
                        <div key={domain} className="space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <span className={`text-xs font-bold uppercase tracking-wider ${noneSelectedInDomain && permissionFilter === 'all' ? 'text-slate-400' : 'text-slate-900'}`}>
                              {domainLabels[domain] || domain}
                            </span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${
                              noneSelectedInDomain
                                ? 'bg-slate-50 text-slate-400 border-slate-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}>
                              {grantedInDomain.length} / {domainPerms.length} enabled
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-2.5">
                            {filteredPerms.map((perm) => {
                              const isGranted = rolePermKeys.has(perm.key);
                              const isCritical = perm.risk_level === 'critical';
                              const isHigh = perm.risk_level === 'high';

                              return (
                                <div
                                  key={perm.key}
                                  className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs transition-all ${
                                    isGranted
                                      ? 'bg-white border-slate-200 shadow-xs border-l-4 border-l-emerald-500'
                                      : 'bg-slate-50/40 border border-dashed border-slate-200/60 opacity-45 hover:opacity-85'
                                  }`}
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {/* Permission Label */}
                                      <span
                                        className={`text-xs ${
                                          isGranted ? 'font-bold text-slate-900' : 'font-medium text-slate-400'
                                        }`}
                                      >
                                        {perm.label}
                                      </span>

                                      {/* Risk badge: colored if granted, soft neutral if unassigned */}
                                      {isCritical && (
                                        isGranted ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
                                            <ShieldWarning size={11} weight="bold" />
                                            High Risk
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-medium bg-slate-100 text-slate-400 border border-slate-200/60">
                                            High Risk
                                          </span>
                                        )
                                      )}
                                      {isHigh && (
                                        isGranted ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                                            <ShieldCheck size={11} weight="bold" />
                                            Sensitive
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-medium bg-slate-100 text-slate-400 border border-slate-200/60">
                                            Sensitive
                                          </span>
                                        )
                                      )}
                                    </div>

                                    {/* Description */}
                                    <p
                                      className={`text-xs leading-relaxed ${
                                        isGranted ? 'text-slate-600 font-normal' : 'text-[11px] text-slate-400 font-normal'
                                      }`}
                                    >
                                      {perm.description}
                                    </p>
                                  </div>

                                  {/* Distinct Pill Status */}
                                  <div className="shrink-0 mt-0.5">
                                    {isGranted ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                        <Check size={13} weight="bold" />
                                        <span>Allowed</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-400 border border-slate-200/60">
                                        <span>Not Allowed</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                    .filter(Boolean);

                  if (renderedDomains.length === 0) {
                    return (
                      <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                        {permissionFilter === 'granted'
                          ? 'This role currently has no permissions assigned.'
                          : 'No permissions match this filter.'}
                      </div>
                    );
                  }

                  return renderedDomains;
                })()}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-2xl">
              Select a security role from the left to inspect its permission matrix.
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/75">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  {modalMode === 'create' ? 'Create Custom Role' : `Edit Role: ${formName}`}
                </h3>
                <p className="text-xs font-medium text-slate-600 mt-0.5">
                  Type the role name, choose an icon, and select what actions this role can perform.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {errorMessage && (
              <div className="mx-6 mt-4 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <ShieldWarning size={16} weight="bold" className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveRole} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
                {/* Basic Meta */}
                <div>
                  <label className="block font-bold text-slate-800 text-xs mb-1.5">
                    Role Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Operations Manager, Support Agent, Kitchen Coordinator"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>

                {/* Profile Symbol Selector (Replaces Colors) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-800 text-xs">
                      Choose Role Icon *
                    </label>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Selected: <strong>{ROLE_SYMBOLS.find((s) => s.id === formIcon)?.label || formIcon}</strong>
                    </span>
                  </div>

                  {/* Symbol Grid */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-48 overflow-y-auto">
                    {ROLE_SYMBOLS.map((sym) => {
                      const IconComp = sym.Icon;
                      const isSelected = formIcon === sym.id;
                      return (
                        <button
                          key={sym.id}
                          type="button"
                          onClick={() => setFormIcon(sym.id)}
                          title={`${sym.label} (${sym.category})`}
                          className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm scale-105 ring-2 ring-rose-500/40'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <IconComp size={20} weight={isSelected ? 'bold' : 'regular'} />
                          <span className="text-[9px] font-bold truncate max-w-full text-center">
                            {sym.label.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Preview Card */}
                <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between">
                  <span className="text-slate-700 font-bold text-xs">Role Badge Preview:</span>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-xs">
                    <ActiveFormIconComponent size={16} weight="bold" />
                    <span>{formName || 'Role Title Preview'}</span>
                  </div>
                </div>

                {/* Permissions Selector */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-900 text-xs">
                      Choose Allowed Actions ({selectedPermissionKeys.length} of {permissions.length} selected)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPermissionKeys(permissions.map((p) => p.key))}
                        className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedPermissionKeys([])}
                        className="text-slate-600 hover:text-slate-800 font-bold cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Non-Native English Friendly Legend - Calmed Design */}
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-2.5 text-xs text-slate-600">
                    <ShieldCheck size={16} weight="bold" className="text-slate-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-800">Permission Levels:</span>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Standard actions let staff view records and do daily work. Actions marked <span className="font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded text-[10px]">Sensitive</span> handle private customer/rider documents or blocking accounts. Actions marked <span className="font-semibold text-rose-800 bg-rose-50 border border-rose-200/80 px-1.5 py-0.5 rounded text-[10px]">High Risk</span> handle real money, fee changes, or password resets.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {Object.entries(permissionsByDomain).map(([domain, domainPerms]) => {
                      const domainKeys = domainPerms.map((p) => p.key);
                      const allSelected = domainKeys.every((k) =>
                        selectedPermissionKeys.includes(k)
                      );

                      return (
                        <div key={domain} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white shadow-2xs">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                              {domainLabels[domain] || domain}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleDomainAll(domain)}
                              className="text-xs text-slate-600 hover:text-slate-900 font-bold cursor-pointer"
                            >
                              {allSelected ? 'Deselect All' : 'Select All In Section'}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {domainPerms.map((perm) => {
                              const isChecked = selectedPermissionKeys.includes(perm.key);
                              const isCritical = perm.risk_level === 'critical';
                              const isHigh = perm.risk_level === 'high';

                              return (
                                <label
                                  key={perm.key}
                                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                                    isChecked
                                      ? 'border-emerald-300 bg-emerald-50/40 shadow-2xs text-slate-950 border-l-4 border-l-emerald-500'
                                      : 'border-slate-200/80 bg-slate-50/30 hover:bg-white text-slate-600 opacity-60 hover:opacity-95'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTogglePermission(perm.key)}
                                    className="mt-0.5 rounded-sm border-slate-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500 cursor-pointer h-4 w-4 shrink-0"
                                  />
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`text-xs ${isChecked ? 'font-bold text-slate-950' : 'font-medium text-slate-500'}`}>
                                        {perm.label}
                                      </span>
                                      {isCritical && (
                                        isChecked ? (
                                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
                                            High Risk
                                          </span>
                                        ) : (
                                          <span className="text-[9px] px-1.5 py-0.2 rounded-full font-medium bg-slate-100 text-slate-400 border border-slate-200/60">
                                            High Risk
                                          </span>
                                        )
                                      )}
                                      {isHigh && (
                                        isChecked ? (
                                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                                            Sensitive
                                          </span>
                                        ) : (
                                          <span className="text-[9px] px-1.5 py-0.2 rounded-full font-medium bg-slate-100 text-slate-400 border border-slate-200/60">
                                            Sensitive
                                          </span>
                                        )
                                      )}
                                    </div>
                                    <p className={`text-[11px] leading-snug ${isChecked ? 'text-slate-600 font-normal' : 'text-slate-400 font-normal'}`}>
                                      {perm.description}
                                    </p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 bg-white rounded-xl text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSaving ? 'Saving...' : modalMode === 'create' ? 'Create Role' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {roleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <Trash size={22} weight="bold" />
              </div>
              <h3 className="font-bold text-base text-slate-900">
                Delete Role: {roleToDelete.name}?
              </h3>
            </div>

            <p className="text-xs font-medium text-slate-700 leading-relaxed">
              Are you sure you want to permanently delete this role? Any administrator accounts currently assigned to this role will lose their custom privileges immediately.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setRoleToDelete(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteRole}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
