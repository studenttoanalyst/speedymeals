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
        className="w-full max-w-md bg-white border border-ink-200 shadow-3 rounded-lg p-6 animate-in fade-in zoom-in-95 duration-100"
      >
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-md border shrink-0 ${
              variant === 'danger'
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-blue-50 text-blue-600 border-blue-200'
            }`}
          >
            <WarningCircle size={22} weight="bold" />
          </div>

          <div className="flex-1">
            <h3 className="text-base font-semibold text-ink-900 mb-1">
              {title}
            </h3>
            <p className="text-sm text-ink-600 leading-relaxed">
              {displayMessage}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-ink-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium border border-ink-200 bg-white text-ink-700 rounded-sm hover:bg-ink-50 transition-colors disabled:opacity-40"
          >
            {displayCancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-sm transition-colors disabled:opacity-50 flex items-center gap-2 ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
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
