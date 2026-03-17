import React from 'react';

export default function PageHeader({ title, subtitle }) {
  return (
    <div className="mb-8">
      <h1 className="text-4xl font-bold text-slate-900 mb-2">{title}</h1>
      {subtitle && <p className="text-slate-600">{subtitle}</p>}
    </div>
  );
}