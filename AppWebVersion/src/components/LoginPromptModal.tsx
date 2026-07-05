import React from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginPromptModalProps {
  open: boolean;
  message: string;
  onClose: () => void;
}

export function LoginPromptModal({ open, message, onClose }: LoginPromptModalProps) {
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm mx-4 bg-white rounded-2xl shadow-xl p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-2">Login Required</h4>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/login');
            }}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
}

export function useLoginPrompt() {
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState('Please log in to continue.');

  const promptLogin = (msg: string) => {
    setMessage(msg);
    setOpen(true);
    return false;
  };

  const modal = (
    <LoginPromptModal open={open} message={message} onClose={() => setOpen(false)} />
  );

  return { promptLogin, loginModal: modal };
}
