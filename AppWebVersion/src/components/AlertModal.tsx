import React from 'react';
import { X, AlertCircle, CheckCircle, Info, Download } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'error' | 'success' | 'info' | 'warning';
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
  showCloseButton?: boolean;
}

export function AlertModal({
  isOpen,
  onClose,
  type,
  title,
  message,
  actionText,
  onAction,
  showCloseButton = true
}: AlertModalProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-8 h-8 text-red-500" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-8 h-8 text-yellow-500" />;
      case 'info':
        return <Info className="w-8 h-8 text-blue-500" />;
      default:
        return <Info className="w-8 h-8 text-blue-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'error':
        return 'text-red-800';
      case 'success':
        return 'text-green-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-blue-800';
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'error':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl shadow-xl max-w-md w-full border-2 ${getBackgroundColor()}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {getIcon()}
            <h3 className={`text-lg font-semibold ${getTextColor()}`}>
              {title}
            </h3>
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <p className={`text-sm leading-relaxed ${getTextColor()}`}>
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 p-6 pt-0">
          {actionText && onAction && (
            <button
              onClick={onAction}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${getButtonColor()}`}
            >
              {actionText}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            {actionText ? 'Cancel' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Specialized modal for mobile app download
export function DownloadAppModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <AlertModal
      isOpen={isOpen}
      onClose={onClose}
      type="info"
      title="Download Mobile App"
      message="To use this service, you need to register first using our mobile app. Please download the SNAP mobile app from your app store or Play store, create an account, and then return to use the web version."
      actionText="Download App"
      onAction={() => {
        // You can add actual download links here
        window.open('https://apps.apple.com/app/snap', '_blank');
      }}
    />
  );
}

// Specialized modal for incomplete registration
export function IncompleteRegistrationModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <AlertModal
      isOpen={isOpen}
      onClose={onClose}
      type="warning"
      title="Complete Registration"
      message="Your account registration is incomplete. Please open the SNAP mobile app and complete your profile setup (add your first name and last name), then return to use the web version."
      actionText="Open Mobile App"
      onAction={() => {
        // You can add deep linking here
        window.open('snap://profile', '_blank');
      }}
    />
  );
}
