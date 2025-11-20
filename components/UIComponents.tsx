
import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = "", title }) => (
  <div className={`glass rounded-xl p-6 ${className}`}>
    {title && <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-4">{title}</h3>}
    {children}
  </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }> = 
  ({ children, className = "", variant = 'primary', ...props }) => {
    const baseStyles = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
      primary: "bg-primary hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20",
      secondary: "bg-surface hover:bg-slate-700 text-white border border-slate-700",
      danger: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
      ghost: "text-gray-400 hover:text-white hover:bg-white/5"
    };
    
    return (
      <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
        {children}
      </button>
    );
  };

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = "", ...props }) => (
  <input 
    className={`w-full bg-darker border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-slate-500 ${className}`}
    {...props}
  />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className = "", ...props }) => (
  <div className={`relative ${className}`}>
    <select 
      className="w-full bg-darker border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none"
      {...props}
    />
    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
      ▼
    </div>
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; color?: string; title?: string; className?: string }> = ({ children, color = "bg-slate-700 text-slate-300", title, className = "" }) => (
  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${color} ${className}`} title={title}>
    {children}
  </span>
);

export const Money: React.FC<{ 
  value: number; 
  privacy?: boolean; 
  currency?: string;
  colored?: boolean;
  sign?: boolean;
  fractionDigits?: number;
}> = ({ value, privacy = false, currency = '€', colored = false, sign = false, fractionDigits = 2 }) => {
  if (privacy) {
    return <span className="tracking-widest select-none blur-[2px] text-slate-400">••••••</span>;
  }

  const formatted = value.toLocaleString(undefined, { 
    minimumFractionDigits: fractionDigits, 
    maximumFractionDigits: fractionDigits 
  });

  const colorClass = colored 
    ? (value >= 0 ? 'text-emerald-400' : 'text-red-400') 
    : '';

  const signPrefix = sign ? (value >= 0 ? '+' : '') : (value < 0 ? '-' : '');
  const absFormatted = sign ? Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }) : formatted;

  return (
    <span className={`${colorClass} whitespace-nowrap`}>
      {sign ? signPrefix : ''}{currency}{sign ? absFormatted : formatted}
    </span>
  );
};
