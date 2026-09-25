'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { UploadSimple, X, Image as ImageIcon, CheckCircle, Warning } from '@phosphor-icons/react';

export interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  aspectRatio?: '1:1' | '16:9' | '4:3' | '3:1' | 'auto';
  maxSizeMB?: number;
  label?: string;
  hint?: string;
  className?: string;
  disabled?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  aspectRatio = '4:3',
  maxSizeMB = 5,
  label,
  hint,
  className = '',
  disabled = false,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Aspect ratio classes and recommendations
  const aspectConfig = {
    '1:1': {
      class: 'aspect-square max-w-[200px]',
      rec: 'Recommended 512×512px (Square, PNG/JPG up to 5MB)',
    },
    '16:9': {
      class: 'aspect-video w-full max-w-lg',
      rec: 'Recommended 1280×720px (16:9 Widescreen, PNG/JPG up to 5MB)',
    },
    '4:3': {
      class: 'aspect-[4/3] w-full max-w-sm',
      rec: 'Recommended 800×600px (4:3 Dish Photo, PNG/JPG up to 5MB)',
    },
    '3:1': {
      class: 'aspect-[3/1] w-full',
      rec: 'Recommended 1200×400px (3:1 Hero/Promo Banner, PNG/JPG up to 5MB)',
    },
    'auto': {
      class: 'min-h-[160px] w-full',
      rec: 'Recommended high-resolution PNG/JPG up to 5MB',
    },
  }[aspectRatio];

  const handleFileProcess = (file: File) => {
    setErrorMessage(null);

    // Validate type
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }

    // Validate size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setErrorMessage(`Image size exceeds ${maxSizeMB}MB limit.`);
      return;
    }

    setIsUploading(true);

    // Create local object URL for instant preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setTimeout(() => {
        setIsUploading(false);
        onChange(result);
      }, 400); // Simulate smooth upload progress
    };
    reader.onerror = () => {
      setIsUploading(false);
      setErrorMessage('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-700 tracking-tight">
            {label}
          </label>
          <span className="text-[11px] text-slate-400">
            {hint || aspectConfig.rec}
          </span>
        </div>
      )}

      {/* Upload Zone / Preview Card */}
      <div
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative overflow-hidden rounded-xl border-2 transition-all duration-200 cursor-pointer ${aspectConfig.class} ${
          isDragging
            ? 'border-rose-500 bg-rose-50/40 ring-4 ring-rose-500/10'
            : value
            ? 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
            : 'border-dashed border-slate-300 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-400'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/jpg"
          onChange={handleFileChange}
          disabled={disabled}
          className="hidden"
        />

        {value ? (
          /* Image Preview Mode */
          <div className="relative w-full h-full group flex items-center justify-center bg-slate-900/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Uploaded Preview"
              className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-102"
            />

            {/* Hover overlay with actions */}
            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-3 py-1.5 bg-white text-slate-700 text-xs font-medium rounded-lg shadow hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
              >
                <UploadSimple size={14} weight="bold" />
                Change Image
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="p-1.5 bg-rose-600 text-white text-xs font-medium rounded-lg shadow hover:bg-rose-700 flex items-center justify-center transition-colors"
                title="Remove Image"
              >
                <X size={14} weight="bold" />
              </button>
            </div>

            {/* Badge Indicator */}
            <div className="absolute top-2.5 right-2.5 bg-emerald-500/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-xs shadow-xs">
              <CheckCircle size={12} weight="bold" />
              Uploaded
            </div>
          </div>
        ) : (
          /* Empty / Upload Prompt Mode */
          <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center select-none min-h-[140px]">
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
                <span className="text-xs text-slate-600 font-medium">Processing image...</span>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <ImageIcon size={20} weight="regular" />
                </div>
                <div className="text-xs font-medium text-slate-700 mb-0.5">
                  <span className="text-rose-600 font-semibold hover:underline">Click to upload</span> or drag and drop
                </div>
                <div className="text-[11px] text-slate-400 max-w-[220px]">
                  PNG, JPG, or WebP (max. {maxSizeMB}MB)
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
          <Warning size={14} weight="bold" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
