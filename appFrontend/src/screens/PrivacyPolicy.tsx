import React from 'react'
import {
  View,
  Text,
  SafeAreaView,
  StatusBar,
  Platform,
  StyleSheet,
  TouchableOpacity,
  ScrollView
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'

export default function PrivacyPolicy() {
  const navigation = useNavigation()

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>Cloud Nexus Data Protection and Privacy Policy</Text>

        <Text style={styles.paragraph}>
          Cloud Nexus is a leading technology solutions provider in The Gambia. We are dedicated to
          building and maintaining trust with our clients, partners, employees, and users. This Data
          Protection and Privacy Policy explains how we collect, process, use, store, and protect your
          personal data in accordance with the laws of The Gambia, including the Information and
          Communications Act, 2009, the Access to Information Act, 2021, and in anticipation of
          the full implementation of the Data Protection and Privacy Act, 2021.
        </Text>
        <Text style={styles.paragraph}>
          This policy applies to all personal data collected and processed by Cloud Nexus, whether in a
          digital or physical format. This includes data processed through our website, mobile
          applications, and all other business interactions. It is a mandatory policy for all Cloud Nexus
          employees, contractors, and any third parties who handle personal data on our behalf.
        </Text>

        <Text style={styles.h2}>Key Definitions</Text>
        <View style={styles.list}>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>{'\u2022'}</Text>
            <Text style={styles.listText}><Text style={styles.bold}>Personal Data:</Text> Any information that relates to an identified or identifiable person. This includes information such as names, identification numbers, location data, email addresses, and any other data that, alone or in combination with other data, can identify an individual.</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>{'\u2022'}</Text>
            <Text style={styles.listText}><Text style={styles.bold}>Processing:</Text> Any action performed on personal data, whether automated or not. This includes collection, recording, organization, structuring, storage, retrieval, consultation, use, disclosure, dissemination, or destruction.</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>{'\u2022'}</Text>
            <Text style={styles.listText}><Text style={styles.bold}>Data Controller:</Text> Cloud Nexus, as the entity that determines the purposes and means of processing personal data.</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>{'\u2022'}</Text>
            <Text style={styles.listText}><Text style={styles.bold}>Data Processor:</Text> A person or entity that processes personal data on behalf of Cloud Nexus.</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>{'\u2022'}</Text>
            <Text style={styles.listText}><Text style={styles.bold}>Regulatory Body:</Text> The Public Utilities Regulatory Authority (PURA) and any future Data Protection Commission designated under Gambian law.</Text>
          </View>
        </View>

        <Text style={styles.h2}>Data Protection Principles</Text>
        <Text style={styles.paragraph}>Cloud Nexus is committed to upholding the following principles when handling personal data:</Text>
        <View style={styles.list}>
          <View style={styles.listItem}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.listText}><Text style={styles.bold}>Lawfulness, Fairness, and Transparency:</Text> We will only collect and process personal data with a valid legal basis, and we will do so in a fair, transparent manner.</Text></View>
          <View style={styles.listItem}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.listText}><Text style={styles.bold}>Purpose Limitation:</Text> Data will only be collected for specified, explicit, and legitimate purposes. We will not process data in a way that is incompatible with the initial purpose for which it was collected.</Text></View>
          <View style={styles.listItem}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.listText}><Text style={styles.bold}>Data Minimisation:</Text> We will only collect personal data that is adequate, relevant, and limited to what is necessary for the purposes for which it is processed.</Text></View>
          <View style={styles.listItem}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.listText}><Text style={styles.bold}>Accuracy:</Text> We will take reasonable steps to ensure that personal data is accurate and, where necessary, kept up to date.</Text></View>
          <View style={styles.listItem}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.listText}><Text style={styles.bold}>Storage Limitation:</Text> We will retain personal data only for as long as necessary to fulfill the purposes for which it was collected, unless a longer retention period is required by law.</Text></View>
          <View style={styles.listItem}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.listText}><Text style={styles.bold}>Integrity and Confidentiality:</Text> We will protect personal data from unauthorized access, accidental loss, destruction, or damage using appropriate technical and organizational measures.</Text></View>
        </View>

        <Text style={styles.h2}>Collection and Use of Personal Data</Text>
        <View style={styles.list}>
          <View style={styles.listItem}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.listText}><Text style={styles.bold}>Client and Partner Data:</Text> We collect contact information, company details, and billing information to provide our services, manage our business relationship, and comply with legal obligations.</Text></View>
          <View style={styles.listItem}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.listText}><Text style={styles.bold}>Employee and Candidate Data:</Text> We collect personal data for human resources, payroll, and recruitment purposes, including names, contact information, educational and professional history.</Text></View>
          <View style={styles.listItem}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.listText}><Text style={styles.bold}>Website and Service User Data:</Text> When you visit our website or use our services, we may collect technical data such as your IP address, browser type, and usage patterns. This data is used to improve our services, analyze trends, and ensure the security of our platforms. We use cookies and similar technologies for this purpose. You can manage your cookie preferences through your browser settings.</Text></View>
        </View>

        <Text style={styles.h2}>Data Subject Rights</Text>
        <View style={styles.list}>
          <View style={styles.listItem}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.listText}><Text style={styles.bold}>Right to Information:</Text> You have the right to be informed about how and why your personal data is being processed.</Text></View>
          <View style={styles.listItem}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.listText}><Text style={styles.bold}>Right of Access:</Text> You can request access to the personal data we hold about you.</Text></View>
          <View style={styles.listItem}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.listText}><Text style={styles.bold}>Right to Rectification:</Text> You can request the correction of any inaccurate or incomplete personal data.</Text></View>
          <View style={styles.listItem}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.listText}><Text style={styles.bold}>Right to Object:</Text> You can object to the processing of your personal data for direct marketing purposes.</Text></View>
          <View style={styles.listItem}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.listText}><Text style={styles.bold}>Right to Erasure:</Text> You have the right to request the deletion of your personal data under certain circumstances (e.g., when it is no longer necessary for the purpose it was collected).</Text></View>
        </View>
        <Text style={styles.paragraph}>To exercise any of these rights, please contact our Data Protection Officer/Head of Compliance using the contact information provided below. We will respond to your request within a reasonable timeframe as required by law.</Text>

        <Text style={styles.h2}>Data Sharing and Transfers</Text>
        <Text style={styles.paragraph}>Cloud Nexus will not sell or rent your personal data to third parties. We may share your data with trusted third parties who provide services on our behalf (e.g., cloud hosting, payment processing, professional services). These third parties are contractually bound to process the data only for the specified purposes and to maintain the same level of data security as Cloud Nexus. In the event of transferring data outside of The Gambia, we will ensure that the destination country has adequate data protection laws or that appropriate safeguards are in place, such as standard contractual clauses, to protect your personal data.</Text>

        <Text style={styles.h2}>Data Security</Text>
        <View style={styles.list}>
          <View style={styles.listItem}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.listText}><Text style={styles.bold}>Access controls:</Text> Limiting access to personal data to only those employees who have a legitimate business need to access it.</Text></View>
          <View style={styles.listItem}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.listText}><Text style={styles.bold}>Data encryption:</Text> Encrypting data both in transit and at rest to prevent unauthorized access.</Text></View>
          <View style={styles.listItem}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.listText}><Text style={styles.bold}>Regular security audits:</Text> Conducting regular vulnerability assessments and penetration tests to identify and address security risks.</Text></View>
          <View style={styles.listItem}><Text style={styles.bullet}>{'\u2022'}</Text><Text style={styles.listText}><Text style={styles.bold}>Employee training:</Text> Ensuring all staff receive regular training on data protection and privacy best practices.</Text></View>
        </View>
        <Text style={styles.paragraph}>In the event of a data breach that could result in a high risk to your rights and freedoms, we will notify the relevant Gambian authorities and affected individuals as required by law.</Text>

        <Text style={styles.h2}>Contact Information</Text>
        <View style={styles.list}>
          <View style={styles.listItem}><Text style={styles.bulletLabel}>Compliance:</Text><Text style={styles.listText}> Head of Compliance</Text></View>
          <View style={styles.listItem}><Text style={styles.bulletLabel}>Email:</Text><Text style={styles.listText}> compliance@cloudnexus.biz</Text></View>
          <View style={styles.listItem}><Text style={styles.bulletLabel}>Address:</Text><Text style={styles.listText}> Serrekunda, Banjul, The Gambia</Text></View>
        </View>

        <Text style={styles.h2}>Policy Review and Updates</Text>
        <Text style={styles.paragraph}>This policy will be reviewed and updated regularly to reflect changes in our business operations, new technologies, or the evolution of The Gambia's data protection laws. Any significant changes to this policy will be communicated through our website and, where appropriate, directly to our clients and partners.</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  h1: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  h2: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 18,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: '#111827',
    marginBottom: 10,
  },
  bold: {
    fontWeight: '700',
    color: '#111827',
  },
  list: {
    marginBottom: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bullet: {
    width: 18,
    lineHeight: 22,
    color: '#111827',
  },
  bulletLabel: {
    fontWeight: '700',
    width: 90,
    color: '#111827',
  },
  listText: {
    flex: 1,
    lineHeight: 22,
    color: '#111827',
  },
})


