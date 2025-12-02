import React from 'react';

// Utility for formatting currency to Brazilian Real (pt-BR)
// Ex: 10000.30 -> R$ 10.000,30
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const Card: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-100 p-6 ${className}`}>
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
    primary: "bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-400",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:bg-slate-100",
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
  <div className="flex flex-col gap-1">
    <label className="text-xs font-semibold uppercase text-slate-500">{label}</label>
    <select 
      value={value} 
      onChange={onChange}
      className="border border-slate-300 rounded-lg p-2 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
    >
      {options.map(opt => (
        <option key={opt} value={opt} className="text-slate-800">{opt}</option>
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
  <div className="flex flex-col gap-1">
    <label className="text-xs font-semibold uppercase text-slate-500">{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={onChange}
      placeholder={placeholder}
      className="border border-slate-300 rounded-lg p-2 bg-white text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none"
    />
  </div>
);