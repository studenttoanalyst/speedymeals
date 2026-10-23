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
import { tokens } from '@/lib/design-tokens';

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
  const selectedPermissionSet = useMemo(
    () => new Set(selectedPermissionKeys),
    [selectedPermissionKeys]
  );
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

  const DOMAIN_ORDER = [
    'restaurants',
    'riders',
    'orders',
    'finance',
    'customers',
    'marketing',
    'pricing',
    'analytics',
    'admins',
  ];

  const domainLabels: Record<string, string> = {
    restaurants: 'Merchants & Food Partners',
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
    setSelectedPermissionKeys((prev) => {
      const s = new Set(prev);
      if (s.has(key)) {
        s.delete(key);
      } else {
        s.add(key);
      }
      return Array.from(s);
    });
  };

  const handleToggleDomainAll = (domain: string) => {
    const domainPerms = permissionsByDomain[domain] || [];
    const domainKeys = domainPerms.map((p) => p.key);
    const allSelected = domainKeys.every((k) => selectedPermissionSet.has(k));

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
          color: tokens.ink900,
          permission_keys: selectedPermissionKeys,
        });
        setRoles((prev) => [...prev, newRole]);
        setSelectedRole(newRole);
        setSuccessMessage(`Role "${newRole.name}" created successfully.`);
      } else if (selectedRole) {
        const updatedRole = await updateAdminRole(selectedRole.id, {
          name: formName.trim(),
          icon: formIcon,
          color: tokens.ink900,
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
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">
            Staff Roles & Permissions
          </h1>
          <span className="px-2.5 py-0.5 rounded-xs text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
            Access Control
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-ink-900 hover:bg-ink-800 text-white font-semibold text-xs shadow-1 transition-colors cursor-pointer"
          >
            <Plus size={16} weight="bold" />
            <span>Create New Role</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-md border border-green-200 bg-green-50 text-green-900 text-xs font-medium flex items-center justify-between animate-fade-in shadow-1">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} weight="bold" className="text-green-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-green-700 hover:text-green-900 cursor-pointer">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Main 2-Column Split: Roles List & Selected Role Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Roles Roster (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative">
            <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search roles..."
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-ink-300 rounded-sm text-xs text-ink-900 placeholder:text-ink-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 shadow-1 font-medium"
            />
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="p-8 text-center text-xs font-medium text-ink-500 bg-white border border-ink-200 rounded-md">
                Loading roles...
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="p-8 text-center text-xs font-medium text-ink-500 bg-white border border-ink-200 rounded-md">
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
                    className={`p-4 rounded-md border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-ink-50/70 border-ink-900 shadow-1 ring-1 ring-ink-900/10'
                        : 'bg-white border-ink-200 hover:border-ink-300 hover:shadow-1'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Profile Symbol Badge */}
                        <div
                          className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-ink-900 text-white shadow-1'
                              : 'bg-ink-100 text-ink-700 border border-ink-200'
                          }`}
                        >
                          <RoleIcon size={20} weight="bold" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-ink-900">
                              {role.name}
                            </span>
                            {role.is_system && (
                              <span className="inline-flex items-center gap-1 text-2xs font-bold tracking-wider uppercase px-2 py-0.5 rounded-xs bg-ink-100 text-ink-700 border border-ink-200">
                                <LockKey size={11} weight="bold" />
                                System
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-ink-500 font-medium mt-0.5">
                            {role.permissions.length} allowed actions
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-ink-50 border border-ink-200 text-ink-700 text-xs font-semibold shrink-0">
                        <Users size={13} weight="bold" />
                        <span>{role.admin_count}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-ink-100 flex items-center justify-between text-xs">
                      <span className="text-ink-500 font-medium">Click to inspect</span>
                      <span className={isSelected ? 'text-ink-900 font-bold' : 'text-ink-500 hover:text-ink-800'}>
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
            <div className="bg-white border border-ink-200 rounded-md shadow-1 overflow-hidden">
              {/* Role Header Banner */}
              <div className="p-6 border-b border-ink-200 bg-ink-50/75 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {/* Selected Role Profile Symbol */}
                  {(() => {
                    const SelectedIcon = getRoleSymbolIcon(selectedRole.icon);
                    return (
                      <div className="w-12 h-12 rounded-md bg-ink-900 text-white flex items-center justify-center shrink-0 shadow-1">
                        <SelectedIcon size={24} weight="bold" />
                      </div>
                    );
                  })()}

                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl font-bold text-ink-900 tracking-tight">
                        {selectedRole.name}
                      </h2>
                      {selectedRole.is_system ? (
                        <span className="inline-flex items-center gap-1 text-2xs font-semibold text-ink-600 bg-ink-200/80 px-2 py-0.5 rounded-xs">
                          <LockKey size={12} weight="bold" />
                          System Protected
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-xs">
                          Custom Role
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-ink-600 mt-1">
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-ink-300 bg-white hover:bg-ink-50 text-ink-800 text-xs font-semibold transition-colors cursor-pointer shadow-1"
                    >
                      <PencilSimple size={14} weight="bold" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setRoleToDelete(selectedRole)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition-colors cursor-pointer shadow-1"
                    >
                      <Trash size={14} weight="bold" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Permission Scope Summary */}
              {/* Permission Scope Summary with Filter Tabs */}
              <div className="p-4 bg-white border-b border-ink-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-ink-800">
                <div className="flex items-center gap-2 font-medium">
                  <ShieldCheck size={18} weight="bold" className="text-green-600" />
                  <span>
                    Allows <strong className="text-ink-900 font-bold">{selectedRole.permissions.length}</strong> of{' '}
                    <strong className="text-ink-900 font-bold">{permissions.length}</strong> system actions
                  </span>
                </div>

                {/* Filter Tabs for Visual Comfort */}
                <div className="flex items-center p-1 bg-ink-100 rounded-md text-xs font-semibold self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setPermissionFilter('all')}
                    className={`px-3 py-1.5 rounded-sm transition-all cursor-pointer ${
                      permissionFilter === 'all'
                        ? 'bg-white text-ink-900 shadow-1 font-bold'
                        : 'text-ink-500 hover:text-ink-800'
                    }`}
                  >
                    All ({permissions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPermissionFilter('granted')}
                    className={`px-3 py-1.5 rounded-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                      permissionFilter === 'granted'
                        ? 'bg-green-600 text-white shadow-1 font-bold'
                        : 'text-green-700 hover:text-green-900'
                    }`}
                  >
                    <Check size={12} weight="bold" />
                    <span>Allowed Only ({selectedRole.permissions.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPermissionFilter('unassigned')}
                    className={`px-3 py-1.5 rounded-sm transition-all cursor-pointer ${
                      permissionFilter === 'unassigned'
                        ? 'bg-white text-ink-900 shadow-1 font-bold'
                        : 'text-ink-500 hover:text-ink-800'
                    }`}
                  >
                    Not Allowed ({permissions.length - selectedRole.permissions.length})
                  </button>
                </div>
              </div>

              {/* Grouped Permission Details */}
              <div className="p-6 space-y-6 max-h-[680px] overflow-y-auto">
                {/* Non-Native English Friendly Legend - Calmed Design */}
                <div className="p-3 bg-ink-50 border border-ink-200/80 rounded-md flex items-start gap-2.5 text-xs text-ink-600">
                  <ShieldCheck size={18} weight="bold" className="text-ink-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-ink-800">Understanding Permission Levels:</span>
                    <p className="text-2xs text-ink-500 leading-relaxed">
                      Standard actions let staff view records and do daily work. Actions marked <span className="font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded text-2xs">Sensitive</span> handle private customer/rider documents or blocking accounts. Actions marked <span className="font-semibold text-red-800 bg-red-50 border border-red-200/80 px-1.5 py-0.5 rounded text-2xs">High Risk</span> handle real money, fee changes, or password resets.
                    </p>
                  </div>
                </div>

                {(() => {
                  const rolePermKeys = new Set(selectedRole.permissions.map((p) => p.key));
                  const domainEntries = Object.entries(permissionsByDomain).sort(
                    ([a], [b]) => {
                      const idxA = DOMAIN_ORDER.indexOf(a);
                      const idxB = DOMAIN_ORDER.indexOf(b);
                      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
                    }
                  );

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
                          <div className="flex items-center justify-between border-b border-ink-200 pb-2">
                            <span className={`text-xs font-bold uppercase tracking-wider ${noneSelectedInDomain && permissionFilter === 'all' ? 'text-ink-400' : 'text-ink-900'}`}>
                              {domainLabels[domain] || domain}
                            </span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${
                              noneSelectedInDomain
                                ? 'bg-ink-50 text-ink-400 border-ink-200'
                                : 'bg-green-50 text-green-800 border-green-200'
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
                                  className={`p-3.5 rounded-md border flex items-start justify-between gap-3 text-xs transition-all ${
                                    isGranted
                                      ? 'bg-white border-ink-200 shadow-1 border-l-4 border-l-green-500'
                                      : 'bg-ink-50/40 border border-dashed border-ink-200/60 opacity-45 hover:opacity-85'
                                  }`}
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {/* Permission Label */}
                                      <span
                                        className={`text-xs ${
                                          isGranted ? 'font-bold text-ink-900' : 'font-medium text-ink-400'
                                        }`}
                                      >
                                        {perm.label}
                                      </span>

                                      {/* Risk badge: colored if granted, soft neutral if unassigned */}
                                      {isCritical && (
                                        isGranted ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-2xs font-bold bg-red-50 text-red-700 border border-red-200/80">
                                            <ShieldWarning size={11} weight="bold" />
                                            High Risk
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-xs text-2xs font-medium bg-ink-100 text-ink-400 border border-ink-200/60">
                                            High Risk
                                          </span>
                                        )
                                      )}
                                      {isHigh && (
                                        isGranted ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-2xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                                            <ShieldCheck size={11} weight="bold" />
                                            Sensitive
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-xs text-2xs font-medium bg-ink-100 text-ink-400 border border-ink-200/60">
                                            Sensitive
                                          </span>
                                        )
                                      )}
                                    </div>

                                    {/* Description */}
                                    <p
                                      className={`text-xs leading-relaxed ${
                                        isGranted ? 'text-ink-600 font-normal' : 'text-2xs text-ink-400 font-normal'
                                      }`}
                                    >
                                      {perm.description}
                                    </p>
                                  </div>

                                  {/* Distinct Pill Status */}
                                  <div className="shrink-0 mt-0.5">
                                    {isGranted ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xs text-2xs font-bold bg-green-50 text-green-700 border border-green-200 shadow-1">
                                        <Check size={13} weight="bold" />
                                        <span>Allowed</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-2xs font-medium bg-ink-100 text-ink-400 border border-ink-200/60">
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
                      <div className="p-8 text-center text-xs text-ink-500 bg-ink-50 rounded-md border border-ink-200">
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
            <div className="p-12 text-center text-xs font-semibold text-ink-600 bg-white border border-ink-200 rounded-md">
              Select a security role from the left to inspect its permission matrix.
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/60">
          <div className="w-full max-w-3xl bg-white rounded-lg shadow-3 border border-ink-200 overflow-hidden flex flex-col max-h-[92vh] isolate [transform:translateZ(0)]">
            <div className="p-6 border-b border-ink-200 flex items-center justify-between bg-ink-50/75">
              <div>
                <h3 className="font-bold text-lg text-ink-900">
                  {modalMode === 'create' ? 'Create Custom Role' : `Edit Role: ${formName}`}
                </h3>
                <p className="text-xs font-medium text-ink-600 mt-0.5">
                  Type the role name, choose an icon, and select what actions this role can perform.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-sm text-ink-500 hover:text-ink-700 hover:bg-ink-200 cursor-pointer"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {errorMessage && (
              <div className="mx-6 mt-4 p-3 rounded-md border border-red-200 bg-red-50 text-red-800 text-xs font-semibold flex items-center gap-2">
                <ShieldWarning size={16} weight="bold" className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveRole} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs overscroll-contain [contain:content] [will-change:scroll-position] scroll-smooth">
                {/* Basic Meta */}
                <div>
                  <label className="block font-bold text-ink-800 text-xs mb-1.5">
                    Role Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Operations Manager, Support Agent, Kitchen Coordinator"
                    className="w-full px-3.5 py-2.5 border border-ink-300 rounded-sm bg-ink-50 text-ink-900 text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>

                {/* Profile Symbol Selector (Replaces Colors) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-ink-800 text-xs">
                      Choose Role Icon *
                    </label>
                    <span className="text-2xs font-semibold text-ink-500">
                      Selected: <strong>{ROLE_SYMBOLS.find((s) => s.id === formIcon)?.label || formIcon}</strong>
                    </span>
                  </div>

                  {/* Symbol Grid */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 p-3 bg-ink-50 border border-ink-200 rounded-md max-h-48 overflow-y-auto overscroll-contain [contain:content]">
                    {ROLE_SYMBOLS.map((sym) => {
                      const IconComp = sym.Icon;
                      const isSelected = formIcon === sym.id;
                      return (
                        <button
                          key={sym.id}
                          type="button"
                          onClick={() => setFormIcon(sym.id)}
                          title={`${sym.label} (${sym.category})`}
                          className={`p-2.5 rounded-sm border flex flex-col items-center justify-center gap-1 transition-colors duration-100 cursor-pointer ${
                            isSelected
                              ? 'bg-ink-900 text-white border-ink-900 shadow-1 scale-105 ring-2 ring-red-500/40'
                              : 'bg-white text-ink-700 border-ink-200 hover:bg-ink-100 hover:border-ink-300'
                          }`}
                        >
                          <IconComp size={20} weight={isSelected ? 'bold' : 'regular'} />
                          <span className="text-2xs font-bold truncate max-w-full text-center">
                            {sym.label.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Preview Card */}
                <div className="p-3.5 bg-ink-100 border border-ink-200 rounded-md flex items-center justify-between">
                  <span className="text-ink-700 font-bold text-xs">Role Badge Preview:</span>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-ink-900 text-white font-bold text-xs shadow-1">
                    <ActiveFormIconComponent size={16} weight="bold" />
                    <span>{formName || 'Role Title Preview'}</span>
                  </div>
                </div>

                {/* Permissions Selector */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-ink-200">
                    <span className="font-bold text-ink-900 text-xs">
                      Choose Allowed Actions ({selectedPermissionKeys.length} of {permissions.length} selected)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPermissionKeys(permissions.map((p) => p.key))}
                        className="text-red-600 hover:text-red-800 font-bold cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-ink-300">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedPermissionKeys([])}
                        className="text-ink-600 hover:text-ink-800 font-bold cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Non-Native English Friendly Legend - Calmed Design */}
                  <div className="p-3 bg-ink-50 border border-ink-200/80 rounded-md flex items-start gap-2.5 text-xs text-ink-600">
                    <ShieldCheck size={16} weight="bold" className="text-ink-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold text-ink-800">Permission Levels:</span>
                      <p className="text-2xs text-ink-500 leading-relaxed">
                        Standard actions let staff view records and do daily work. Actions marked <span className="font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded text-2xs">Sensitive</span> handle private customer/rider documents or blocking accounts. Actions marked <span className="font-semibold text-red-800 bg-red-50 border border-red-200/80 px-1.5 py-0.5 rounded text-2xs">High Risk</span> handle real money, fee changes, or password resets.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {Object.entries(permissionsByDomain)
                      .sort(([a], [b]) => {
                        const idxA = DOMAIN_ORDER.indexOf(a);
                        const idxB = DOMAIN_ORDER.indexOf(b);
                        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
                      })
                      .map(([domain, domainPerms]) => {
                      const domainKeys = domainPerms.map((p) => p.key);
                      const allSelected = domainKeys.every((k) =>
                        selectedPermissionSet.has(k)
                      );

                      return (
                        <div
                          key={domain}
                          className="border border-ink-200 rounded-md p-4 space-y-3 bg-white [content-visibility:auto] [contain-intrinsic-size:220px]"
                        >
                          <div className="flex items-center justify-between border-b border-ink-100 pb-2">
                            <span className="font-bold text-ink-900 text-xs uppercase tracking-wider">
                              {domainLabels[domain] || domain}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleDomainAll(domain)}
                              className="text-xs text-ink-600 hover:text-ink-900 font-bold cursor-pointer"
                            >
                              {allSelected ? 'Deselect All' : 'Select All In Section'}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {domainPerms.map((perm) => {
                              const isChecked = selectedPermissionSet.has(perm.key);
                              const isCritical = perm.risk_level === 'critical';
                              const isHigh = perm.risk_level === 'high';

                              return (
                                <label
                                  key={perm.key}
                                  className={`p-3 rounded-md border flex items-start gap-3 cursor-pointer select-none transition-colors duration-100 ${
                                    isChecked
                                      ? 'border-green-300 bg-green-50/40 text-ink-950 border-l-4 border-l-green-500'
                                      : 'border-ink-200 bg-ink-50/30 hover:bg-white text-ink-600 opacity-70 hover:opacity-100'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTogglePermission(perm.key)}
                                    className="mt-0.5 rounded-sm border-ink-300 text-green-600 accent-green-600 focus:ring-green-500 cursor-pointer h-4 w-4 shrink-0"
                                  />
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`text-xs ${isChecked ? 'font-bold text-ink-950' : 'font-medium text-ink-500'}`}>
                                        {perm.label}
                                      </span>
                                      {isCritical && (
                                        isChecked ? (
                                          <span className="text-2xs px-1.5 py-0.5 rounded-xs font-bold bg-red-50 text-red-700 border border-red-200/80">
                                            High Risk
                                          </span>
                                        ) : (
                                          <span className="text-2xs px-1.5 py-0.2 rounded-xs font-medium bg-ink-100 text-ink-400 border border-ink-200/60">
                                            High Risk
                                          </span>
                                        )
                                      )}
                                      {isHigh && (
                                        isChecked ? (
                                          <span className="text-2xs px-1.5 py-0.5 rounded-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                                            Sensitive
                                          </span>
                                        ) : (
                                          <span className="text-2xs px-1.5 py-0.2 rounded-xs font-medium bg-ink-100 text-ink-400 border border-ink-200/60">
                                            Sensitive
                                          </span>
                                        )
                                      )}
                                    </div>
                                    <p className={`text-2xs leading-snug ${isChecked ? 'text-ink-600 font-normal' : 'text-ink-400 font-normal'}`}>
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
              <div className="p-4 border-t border-ink-200 bg-ink-50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-ink-300 bg-white rounded-sm text-ink-700 hover:bg-ink-100 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-sm text-xs font-bold shadow-1 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-lg shadow-3 border border-ink-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-md bg-red-50 flex items-center justify-center">
                <Trash size={22} weight="bold" />
              </div>
              <h3 className="font-bold text-base text-ink-900">
                Delete Role: {roleToDelete.name}?
              </h3>
            </div>

            <p className="text-xs font-medium text-ink-700 leading-relaxed">
              Are you sure you want to permanently delete this role? Any administrator accounts currently assigned to this role will lose their custom privileges immediately.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-ink-200">
              <button
                type="button"
                onClick={() => setRoleToDelete(null)}
                className="px-4 py-2 border border-ink-300 rounded-sm text-ink-700 hover:bg-ink-50 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteRole}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-sm text-xs font-bold shadow-1 disabled:opacity-50 cursor-pointer"
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
