'use client';

import React from 'react';
import { WarningCircle } from '@phosphor-icons/react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-[2px]">
      <div
        className="w-full max-w-md bg-paper border border-line shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-100"
        style={{ borderRadius: '0px' }}
      >
        <div className="flex items-start gap-3">
          <div
            className={`p-2 border shrink-0 ${
              variant === 'danger'
                ? 'bg-[#FDF0EE] text-[#C92A2A] border-[#F5C2BC]'
                : 'bg-[#EAF3FA] text-[#1E5FA8] border-[#BAD6F0]'
            }`}
            style={{ borderRadius: '0px' }}
          >
            <WarningCircle size={22} weight="bold" />
          </div>

          <div className="flex-1">
            <h3 className="font-heading font-bold text-base text-ink mb-1">
              {title}
            </h3>
            <p className="font-sans text-xs text-ink-soft leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-line">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-mono font-medium border border-line bg-paper text-ink hover:bg-paper-off transition-colors disabled:opacity-40"
            style={{ borderRadius: '0px' }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-xs font-mono font-semibold text-paper border transition-colors disabled:opacity-50 flex items-center gap-2 ${
              variant === 'danger'
                ? 'bg-[#C92A2A] border-[#C92A2A] hover:bg-[#A82222]'
                : 'bg-red border-red hover:bg-[#C92A2E]'
            }`}
            style={{ borderRadius: '0px' }}
          >
            {isLoading && <span className="w-3 h-3 border-2 border-paper border-t-transparent animate-spin inline-block" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
