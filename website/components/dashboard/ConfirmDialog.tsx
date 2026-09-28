'use client';

import React from 'react';
import { WarningCircle } from '@phosphor-icons/react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message?: string;
  description?: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  description,
  confirmLabel,
  confirmText,
  cancelLabel,
  cancelText,
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const displayMessage = description || message || '';
  const displayConfirm = confirmText || confirmLabel || 'Confirm Action';
  const displayCancel = cancelText || cancelLabel || 'Cancel';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-[2px]">
      <div
        className="w-full max-w-md bg-white border border-[#DADCE0] shadow-2xl rounded-2xl p-6 animate-in fade-in zoom-in-95 duration-100"
      >
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-xl border shrink-0 ${
              variant === 'danger'
                ? 'bg-[#FDF0EE] text-[#C92A2A] border-[#F5C2BC]'
                : 'bg-[#EAF3FA] text-[#1E5FA8] border-[#BAD6F0]'
            }`}
          >
            <WarningCircle size={22} weight="bold" />
          </div>

          <div className="flex-1">
            <h3 className="text-base font-semibold text-[#202124] mb-1">
              {title}
            </h3>
            <p className="text-sm text-[#5F6368] leading-relaxed">
              {displayMessage}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-[#DADCE0]">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium border border-[#DADCE0] bg-white text-[#3C4043] rounded-lg hover:bg-[#F8F9FA] transition-colors disabled:opacity-40"
          >
            {displayCancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
              variant === 'danger'
                ? 'bg-[#EA4335] hover:bg-[#D93025]'
                : 'bg-[#1A73E8] hover:bg-[#1557B0]'
            }`}
          >
            {isLoading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin inline-block rounded-full" />}
            {displayConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
