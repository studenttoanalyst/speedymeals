'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Key,
  Copy,
  Check,
  X,
  MagnifyingGlass,
  ArrowClockwise,
  WarningCircle,
  LockKey,
  EnvelopeSimple,
  Phone,
  DotsThreeVertical,
  CheckCircle,
} from '@phosphor-icons/react';
import {
  getAdminAccounts,
  getAdminRoles,
  createAdminAccount,
  assignAdminRole,
  resetAdminStaffPassword,
  updateAdminAccount,
  AdminAccount,
  AdminRole,
  CreatedAdminAccountResponse,
} from '@/lib/api/rbac';
import { getRoleSymbolIcon } from '@/lib/icons/roleSymbols';

export default function AdminStaffAccountsPage() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Provisioning Modal State
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // One-Time Credentials Modal State
  const [provisionedResult, setProvisionedResult] = useState<CreatedAdminAccountResponse | null>(null);
  const [hasCopiedPassword, setHasCopiedPassword] = useState(false);
  const [hasCopiedAll, setHasCopiedAll] = useState(false);

  // Role Assignment Modal State
  const [assigningAdmin, setAssigningAdmin] = useState<AdminAccount | null>(null);
  const [targetRoleId, setTargetRoleId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Password Reset Modal State
  const [resettingAdmin, setResettingAdmin] = useState<AdminAccount | null>(null);
  const [newTempPasswordResult, setNewTempPasswordResult] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [accs, rls] = await Promise.all([
        getAdminAccounts(),
        getAdminRoles(),
      ]);
      setAccounts(accs);
      setRoles(rls);
      if (rls.length > 0 && !selectedRoleId) {
        setSelectedRoleId(rls[0].id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load administrator accounts.');
    } finally {
      setIsLoading(false);
    }
  };

  // Live corporate email preview
  const corporateEmailPreview = useMemo(() => {
    const f = firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const l = lastName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (f && l) return `${f}.${l}@speedymeals.pk`;
    if (f) return `${f}@speedymeals.pk`;
    return 'operator@speedymeals.pk';
  }, [firstName, lastName]);

  const handleOpenProvisionModal = () => {
    setFirstName('');
    setLastName('');
    setPhone('');
    setPersonalEmail('');
    if (roles.length > 0) setSelectedRoleId(roles[0].id);
    setErrorMessage(null);
    setIsProvisionModalOpen(true);
  };

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('First and last names are required.');
      return;
    }
    if (!selectedRoleId) {
      setErrorMessage('Please assign a security role.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await createAdminAccount({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || undefined,
        personal_email: personalEmail.trim() || undefined,
        role_id: selectedRoleId,
      });

      // Show one-time credentials card
      setProvisionedResult(result);
      setIsProvisionModalOpen(false);

      // Refresh list
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to provision admin account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignRoleSubmit = async () => {
    if (!assigningAdmin || !targetRoleId) return;
    setIsAssigning(true);
    try {
      const updated = await assignAdminRole(assigningAdmin.id, targetRoleId);
      setAccounts((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      );
      setSuccessMessage(`Role successfully updated for ${updated.first_name || updated.email}.`);
      setAssigningAdmin(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to reassign role.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleResetPasswordSubmit = async () => {
    if (!resettingAdmin) return;
    setIsResetting(true);
    try {
      const res = await resetAdminStaffPassword(resettingAdmin.id);
      setNewTempPasswordResult(res.temporary_password);
      // Mark local state as must_change_password
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === resettingAdmin.id ? { ...a, must_change_password: true } : a
        )
      );
    } catch (err: any) {
      alert(err.message || 'Failed to reset password.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleToggleActiveStatus = async (admin: AdminAccount) => {
    const action = admin.is_active ? 'suspend' : 'activate';
    if (!confirm(`Are you sure you want to ${action} access for ${admin.email}?`)) {
      return;
    }
    try {
      const updated = await updateAdminAccount(admin.id, {
        is_active: !admin.is_active,
      });
      setAccounts((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      );
      setSuccessMessage(`Account ${admin.email} is now ${updated.is_active ? 'Active' : 'Suspended'}.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update account status.');
    }
  };

  const copyToClipboard = (text: string, type: 'password' | 'all') => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === 'password') {
        setHasCopiedPassword(true);
        setTimeout(() => setHasCopiedPassword(false), 2000);
      } else {
        setHasCopiedAll(true);
        setTimeout(() => setHasCopiedAll(false), 2000);
      }
    }
  };

  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return accounts;
    const q = searchQuery.toLowerCase();
    return accounts.filter(
      (a) =>
        a.email.toLowerCase().includes(q) ||
        (a.first_name && a.first_name.toLowerCase().includes(q)) ||
        (a.last_name && a.last_name.toLowerCase().includes(q)) ||
        (a.role_name && a.role_name.toLowerCase().includes(q))
    );
  }, [accounts, searchQuery]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Admin Staff Directory
          </h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 ring-1 ring-rose-200">
            Staff Accounts
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            title="Refresh Directory"
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
          >
            <ArrowClockwise size={16} />
          </button>
          <button
            onClick={handleOpenProvisionModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus size={16} weight="bold" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <Check size={16} weight="bold" className="text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or role..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-2xs font-medium"
          />
        </div>

        <div className="text-xs text-slate-400">
          Showing <strong>{filteredAccounts.length}</strong> staff members
        </div>
      </div>

      {/* Staff Roster Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 uppercase tracking-wider font-bold text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Staff Name</th>
                <th className="py-3.5 px-4">Email Address</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Password Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
                    Loading staff accounts...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
                    No staff accounts found.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((admin) => {
                  const fullName =
                    admin.first_name && admin.last_name
                      ? `${admin.first_name} ${admin.last_name}`
                      : admin.email.split('@')[0];
                  const initial = (admin.first_name?.[0] || admin.email[0]).toUpperCase();
                  const RoleSymbol = getRoleSymbolIcon(admin.role_icon);

                  return (
                    <tr key={admin.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            {initial}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {fullName}
                            </div>
                            {admin.phone && (
                              <div className="text-[11px] text-slate-600 font-medium flex items-center gap-1 mt-0.5">
                                <Phone size={11} />
                                <span>{admin.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Corporate Email */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-slate-900 text-xs font-semibold">
                          {admin.email}
                        </span>
                      </td>

                      {/* Role Pill with Profile Symbol */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 text-white shadow-2xs">
                          <RoleSymbol size={13} weight="bold" />
                          <span>{admin.role_name || 'Standard'}</span>
                        </span>
                      </td>

                      {/* Active / Suspended */}
                      <td className="py-3.5 px-4">
                        {admin.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-300">
                            Suspended
                          </span>
                        )}
                      </td>

                      {/* Credential State */}
                      <td className="py-3.5 px-4">
                        {admin.must_change_password ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                            <LockKey size={12} weight="bold" />
                            Must Change Password
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            Password Active
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setAssigningAdmin(admin);
                              setTargetRoleId(admin.role_id || (roles[0]?.id ?? ''));
                            }}
                            title="Change Staff Role"
                            className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                          >
                            <ShieldCheck size={15} weight="bold" />
                          </button>
                          <button
                            onClick={() => {
                              setResettingAdmin(admin);
                              setNewTempPasswordResult(null);
                            }}
                            title="Reset Password"
                            className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                          >
                            <Key size={15} weight="bold" />
                          </button>
                          <button
                            onClick={() => handleToggleActiveStatus(admin)}
                            title={admin.is_active ? 'Deactivate Account' : 'Activate Account'}
                            className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer shadow-2xs ${
                              admin.is_active
                                ? 'border-rose-300 bg-white hover:bg-rose-50 text-rose-700'
                                : 'border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            <LockKey size={15} weight="bold" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provisioning Modal */}
      {isProvisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Add New Staff Member
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Creates their office work email and temporary login password.
                </p>
              </div>
              <button
                onClick={() => setIsProvisionModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                <WarningCircle size={16} weight="bold" className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleProvisionSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Tariq"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Mehmood"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                  />
                </div>
              </div>

              {/* Corporate Email Live Preview */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    Staff Work Email:
                  </span>
                  <span className="font-mono text-slate-800 font-bold text-xs">
                    {corporateEmailPreview}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  @speedymeals.pk
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mobile Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Personal Email (for recovery)
                  </label>
                  <input
                    type="email"
                    value={personalEmail}
                    onChange={(e) => setPersonalEmail(e.target.value)}
                    placeholder="tariq@gmail.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Assign Role *
                </label>
                <select
                  required
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.permissions.length} actions allowed) {r.is_system ? '- System' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                <strong>Temporary Password:</strong> A secure temporary password will be created. The staff member will be asked to choose their own secret password when they first log in.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProvisionModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Creating...' : 'Create Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* One-Time Credentials Success Modal */}
      {provisionedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle size={32} weight="bold" />
              </div>
              <h3 className="font-bold text-base text-slate-900">
                Staff Account Created!
              </h3>
              <p className="text-xs text-slate-500">
                Share this login information with the staff member:
              </p>
            </div>

            <div className="p-4 bg-slate-900 rounded-2xl text-white space-y-3 font-mono text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">
                  Staff Work Email
                </span>
                <span className="text-emerald-400 font-bold select-all">
                  {provisionedResult.email}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">
                  Temporary Password
                </span>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-emerald-400 font-bold tracking-wider text-sm select-all">
                    {provisionedResult.temporary_password}
                  </span>
                  <button
                    onClick={() => copyToClipboard(provisionedResult.temporary_password, 'password')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Copy Temporary Password"
                  >
                    {hasCopiedPassword ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-sans">
                Assigned Role: <strong>{provisionedResult.role_name}</strong>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700 leading-normal">
              <strong>First Login Notice:</strong> When {provisionedResult.first_name} logs in with this temporary password, the system will ask them to choose their own personal password right away.
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `SpeedyMeals Staff Login Details\nURL: https://speedymeals.pk/admin/login\nEmail: ${provisionedResult.email}\nTemporary Password: ${provisionedResult.temporary_password}\nRole: ${provisionedResult.role_name}`,
                    'all'
                  )
                }
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {hasCopiedAll ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{hasCopiedAll ? 'Copied Summary!' : 'Copy Summary'}</span>
              </button>

              <button
                type="button"
                onClick={() => setProvisionedResult(null)}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Reassignment Modal */}
      {assigningAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              Change Staff Role
            </h3>
            <p className="text-xs text-slate-500">
              Select a new role for{' '}
              <strong>{assigningAdmin.first_name || assigningAdmin.email}</strong>. This will log them out of open sessions so the new permissions take effect immediately.
            </p>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 text-xs">
                Select New Role
              </label>
              <select
                value={targetRoleId}
                onChange={(e) => setTargetRoleId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs font-medium focus:bg-white"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.permissions.length} actions allowed)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setAssigningAdmin(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isAssigning}
                onClick={handleAssignRoleSubmit}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isAssigning ? 'Updating Role...' : 'Save Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resettingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              Reset Staff Password
            </h3>

            {newTempPasswordResult ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-600">
                  A new temporary password has been created for{' '}
                  <strong>{resettingAdmin.email}</strong>.
                </p>

                <div className="p-4 bg-slate-900 rounded-xl font-mono text-center space-y-1">
                  <span className="text-[10px] text-slate-400 block uppercase font-sans">
                    New Temporary Password
                  </span>
                  <div className="text-emerald-400 font-bold text-base tracking-wider select-all">
                    {newTempPasswordResult}
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    onClick={() => {
                      setResettingAdmin(null);
                      setNewTempPasswordResult(null);
                    }}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <p className="text-slate-600 leading-relaxed">
                  Are you sure you want to create a new temporary password for{' '}
                  <strong>{resettingAdmin.email}</strong>? They will be logged out of all devices and asked to set a new password when they log in next.
                </p>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setResettingAdmin(null)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isResetting}
                    onClick={handleResetPasswordSubmit}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isResetting ? 'Resetting...' : 'Create Temporary Password'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
