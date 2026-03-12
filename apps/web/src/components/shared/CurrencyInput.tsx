'use client';

import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { formatCurrency, parseCurrency } from '@/lib/utils';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const numericValue = parseCurrency(e.target.value);
      onChange(numericValue);
    };

    return (
      <Input
        ref={ref}
        {...props}
        value={formatCurrency(value)}
        onChange={handleChange}
        inputMode="numeric"
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';