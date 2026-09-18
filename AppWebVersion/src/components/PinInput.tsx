import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

interface PinInputProps {
  onComplete: (pin: string) => void;
  onBack: () => void;
  loading?: boolean;
  error?: string;
  title?: string;
  subtitle?: string;
  length?: 4 | 6;
  secure?: boolean;
  helpText?: React.ReactNode;
}

export function PinInput({
  onComplete,
  onBack,
  loading = false,
  error,
  title = 'Enter PIN',
  subtitle = 'Enter your 4-digit PIN to continue',
  length = 4,
  secure = true,
  helpText,
}: PinInputProps) {
  const [pin, setPin] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setPin(Array(length).fill(''));
    inputRefs.current[0]?.focus();
  }, [length]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;

    const newPin = [...pin];
    newPin[index] = value.replace(/\D/g, '');
    setPin(newPin);

    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newPin.every((digit) => digit !== '') && newPin.length === length) {
      onComplete(newPin.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    const newPin = pastedData.split('').concat(Array(length - pastedData.length).fill(''));
    setPin(newPin);

    if (pastedData.length === length) {
      onComplete(pastedData);
    } else {
      const nextIndex = pastedData.length;
      if (nextIndex < length) {
        inputRefs.current[nextIndex]?.focus();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center mb-8">
          <button
            type="button"
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="mt-2 text-gray-600">{subtitle}</p>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className={`flex justify-center mb-8 ${length === 6 ? 'space-x-2' : 'space-x-4'}`}>
            {pin.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type={secure ? 'password' : 'text'}
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className={`${
                  length === 6 ? 'w-10 h-12 text-xl' : 'w-12 h-12 text-2xl'
                } text-center font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200`}
                disabled={loading}
                style={{ caretColor: 'transparent' }}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}

          {loading && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          )}
        </div>

        {helpText ? <div className="mt-6 text-center">{helpText}</div> : null}
      </div>
    </div>
  );
}
