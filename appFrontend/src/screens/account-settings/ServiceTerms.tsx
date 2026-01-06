import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, FileText } from 'lucide-react-native';

export function ServiceTerms() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Terms</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          <View style={styles.iconContainer}>
            <FileText size={32} color="#2563EB" />
          </View>
          <Text style={styles.mainTitle}>Cloud Nexus User Agreement</Text>
          <Text style={styles.subtitle}>
            Please read these terms carefully before using our services
          </Text>
        </View>

        {/* Terms Content */}
        <View style={styles.termsContainer}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Introduction</Text>
            <Text style={styles.paragraph}>
              Welcome to Cloud Nexus! This User Agreement governs your use of our e-commerce and ride-booking services. By accessing or using our mobile application, website, or any of our services, you agree to be bound by the terms and conditions outlined in this Agreement. If you do not agree, please do not use our services.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. User Accounts</Text>
            <Text style={styles.paragraph}>
              To use our services, you must create an account. You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate and current.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. E-commerce Services</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>Product Listings:</Text> We provide a platform for third-party sellers to list and sell products. Cloud Nexus is not the seller and does not own the products. We are not responsible for the quality, safety, or legality of the items listed.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>Transactions:</Text> All transactions are conducted between you and the seller. We facilitate the payment process but are not a party to the sale contract.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>Returns & Refunds:</Text> Returns and refunds are subject to the seller's individual policy.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Ride-Booking Services</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>Service as a Platform:</Text> Cloud Nexus acts as a platform to connect you with independent third-party drivers. We do not provide transportation services ourselves.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>Driver Screening:</Text> We perform thorough background checks on drivers, and guide them to be professional, reliable, competent and ensure safety.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>Fees and Payment:</Text> You agree to pay all fees for the ride-booking services, including fares and other charges. The final fare may vary based on demand and traffic.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. User Conduct</Text>
            <Text style={styles.paragraph}>
              You agree to use our services responsibly and lawfully. You must not:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>Violate any laws or regulations.</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>Infringe upon the rights of others.</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>Use the service for fraudulent or illegal activities.</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>Harass, abuse, or harm other users, drivers, or sellers.</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
            <Text style={styles.paragraph}>
              Cloud Nexus shall not be liable for any damages, losses, or injuries arising from your use of our services, including but not limited to, issues with product quality, delays in delivery, or accidents during a ride. Our liability is limited to the fullest extent permitted by law.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Termination</Text>
            <Text style={styles.paragraph}>
              We reserve the right to suspend or terminate your account and access to our services at any time, for any reason, without notice.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Governing Law</Text>
            <Text style={styles.paragraph}>
              This Agreement is governed by the laws of The Gambia. Any disputes will be resolved in the courts of that jurisdiction.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Contact Us</Text>
            <Text style={styles.paragraph}>
              If you have any questions, please contact us at{' '}
              <Text style={styles.link}>info@cloudnexus.biz</Text>
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Last updated: December 2025
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  titleSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  termsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 8,
  },
  bulletList: {
    marginTop: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingLeft: 4,
  },
  bullet: {
    fontSize: 16,
    color: '#6B7280',
    marginRight: 12,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  bold: {
    fontWeight: '600',
    color: '#111827',
  },
  link: {
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
