import React from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const waveImg = require('../../assets/wave.jpg');
const YonnaWalletIcon = require('../../assets/yonna_wallet.svg').default;

export function getPaymentMethodProviderName(method: any): string {
  const fromMeta = method?.metadata?.providerName;
  const provider = method?.provider;
  const name = (fromMeta || provider || '').toString().trim();
  if (name) return name;

  switch ((method?.type || '').toString()) {
    case 'CREDIT_CARD':
      return 'Credit Card';
    case 'DEBIT_CARD':
      return 'Debit Card';
    case 'MOBILE_MONEY':
      return 'Mobile Wallet';
    case 'BANK_TRANSFER':
      return 'Bank Transfer';
    case 'DIGITAL_WALLET':
      return 'Digital Wallet';
    default:
      return 'Payment Method';
  }
}

export function getPaymentMethodAccountLabel(method: any): string {
  const phone = method?.metadata?.phoneNumber || method?.accountId;
  const accountName = method?.accountName;
  const type = (method?.type || '').toString();

  if (type === 'MOBILE_MONEY' || type === 'DIGITAL_WALLET') {
    if (phone && accountName && phone !== accountName) {
      return `${accountName} · ${phone}`;
    }
    return (phone || accountName || '').toString();
  }

  if (accountName && phone && accountName !== phone) {
    return `${accountName} · ${phone}`;
  }
  return (accountName || phone || type.replace(/_/g, ' ') || '').toString();
}

export function PaymentMethodIcon({
  method,
  size = 28,
  color = '#7C3AED',
}: {
  method: any;
  size?: number;
  color?: string;
}) {
  const type = (method?.type || '').toString();
  const providerName = (
    method?.provider ||
    method?.metadata?.providerName ||
    ''
  )
    .toString()
    .toLowerCase();

  if (type === 'MOBILE_MONEY' || type === 'DIGITAL_WALLET') {
    if (providerName.includes('test payment') || method?.metadata?.simulated || method?.id === 'test-payment') {
      return <Ionicons name="flask-outline" size={size - 4} color="#D97706" />;
    }
    if (providerName.includes('wave')) {
      return <Image source={waveImg} style={{ width: size, height: size, borderRadius: 6 }} />;
    }
    if (providerName.includes('yonna') || providerName.includes('aps')) {
      return (
        <YonnaWalletIcon
          width={size}
          height={size}
          fill="#10B981"
          color="#10B981"
          stroke="#10B981"
        />
      );
    }
    if (method?.metadata?.logoUrl || method?.logoUrl) {
      return (
        <Image
          source={{ uri: method.metadata?.logoUrl || method.logoUrl }}
          style={{ width: size, height: size, borderRadius: 6 }}
        />
      );
    }
    return <Ionicons name="phone-portrait-outline" size={size - 4} color={color} />;
  }

  if (type === 'CREDIT_CARD' || type === 'DEBIT_CARD') {
    return <Ionicons name="card-outline" size={size - 4} color={color} />;
  }
  if (type === 'BANK_TRANSFER') {
    return <Ionicons name="business-outline" size={size - 4} color={color} />;
  }
  if (type === 'CRYPTO') {
    return <Ionicons name="logo-bitcoin" size={size - 4} color={color} />;
  }

  return (
    <View style={styles.fallback}>
      <Ionicons name="wallet-outline" size={size - 4} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
