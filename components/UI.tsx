import React from 'react';
import { IconClose } from './Icons';

// Utility for formatting currency to Brazilian Real (pt-BR)
// Agora aceita parametro 'hidden' para o modo privacidade
export const formatCurrency = (value: number, hidden: boolean = false): string => {
  if (hidden) return 'R$ •••••';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const Card: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 transition-colors ${className}`}>
    {children}
  </div>
);

export const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = "",
  disabled = false
}: { 
  children?: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  className?: string;
  disabled?: boolean;
}) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-blue-300 dark:disabled:bg-blue-900",
    secondary: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-900",
    danger: "bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300",
    success: "bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-emerald-300",
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export const Select = ({ 
  label, 
  value, 
  onChange, 
  options 
}: { 
  label: string; 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; 
  options: string[] 
}) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{label}</label>
    <select 
      value={value} 
      onChange={onChange}
      className="border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full"
    >
      {options.map(opt => (
        <option key={opt} value={opt} className="text-slate-800 dark:text-white dark:bg-slate-800">{opt}</option>
      ))}
    </select>
  </div>
);

export const Input = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder
}: {
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
}) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={onChange}
      placeholder={placeholder}
      className="border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none w-full"
    />
  </div>
);

export const Modal = ({
  isOpen,
  onClose,
  title,
  children
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <IconClose className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export const ProgressBar = ({ 
  current, 
  max, 
  label,
  hidden = false
}: { 
  current: number; 
  max: number; 
  label: string;
  hidden?: boolean;
}) => {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));
  const isOver = current > max;
  
  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <span className={`font-bold ${isOver ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
          {formatCurrency(current, hidden)} / {formatCurrency(max, hidden)}
        </span>
      </div>
      <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-red-500' : percentage > 80 ? 'bg-orange-400' : 'bg-blue-500'}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};
