import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import YonnaPaymentModal from '../YonnaPaymentModal';

// Mock the AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      phoneNumber: '+220123456789',
    },
  }),
}));

// Mock the YonnaForexPaymentService
jest.mock('../../services/YonnaForexPaymentService', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    getSupportedCurrencies: jest.fn().mockResolvedValue([
      { code: 'GMD', name: 'Gambian Dalasi', symbol: 'D' },
      { code: 'USD', name: 'US Dollar', symbol: '$' },
    ]),
    processPayment: jest.fn().mockResolvedValue({
      success: true,
      transactionId: 'YF_TEST_123456789',
      message: 'Payment processed successfully',
    }),
  })),
}));

describe('YonnaPaymentModal', () => {
  const mockProps = {
    visible: true,
    amount: 1000,
    orderId: 'ORDER_123',
    onPaymentSuccess: jest.fn(),
    onPaymentError: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible', () => {
    const { getByText } = render(<YonnaPaymentModal {...mockProps} />);
    
    expect(getByText('Yonna Wallet Payment')).toBeTruthy();
    expect(getByText('Payment Details')).toBeTruthy();
    expect(getByText('Amount to Pay')).toBeTruthy();
  });

  it('shows payment summary when proceeding', async () => {
    const { getByText, getByTestId } = render(<YonnaPaymentModal {...mockProps} />);
    
    // Find and press the "Review Payment" button
    const reviewButton = getByText('Review Payment');
    fireEvent.press(reviewButton);
    
    // Wait for the summary step to appear
    await waitFor(() => {
      expect(getByText('Payment Summary')).toBeTruthy();
      expect(getByText('Review before confirming')).toBeTruthy();
    });
  });

  it('calls onClose when close button is pressed', () => {
    const { getByTestId } = render(<YonnaPaymentModal {...mockProps} />);
    
    // Find and press the close button
    const closeButton = getByTestId('close-button');
    fireEvent.press(closeButton);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('displays service fee information in summary', async () => {
    const { getByText } = render(<YonnaPaymentModal {...mockProps} />);
    
    // Proceed to summary
    const reviewButton = getByText('Review Payment');
    fireEvent.press(reviewButton);
    
    await waitFor(() => {
      expect(getByText('Service Fee (7%)')).toBeTruthy();
      expect(getByText('Total Amount')).toBeTruthy();
    });
  });

  it('handles payment processing', async () => {
    const { getByText } = render(<YonnaPaymentModal {...mockProps} />);
    
    // Proceed to summary
    const reviewButton = getByText('Review Payment');
    fireEvent.press(reviewButton);
    
    await waitFor(() => {
      const confirmButton = getByText('Confirm Payment');
      fireEvent.press(confirmButton);
    });
    
    // Should show processing state
    await waitFor(() => {
      expect(getByText('Processing Payment')).toBeTruthy();
    });
  });
});
