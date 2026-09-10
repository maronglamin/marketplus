import AsyncStorage from '@react-native-async-storage/async-storage'

export type AuthMethod = 'email' | 'phone'

const LAST_METHOD_KEY = 'lastAuthMethod'
const LAST_USER_KEY = 'lastUserId'
const LAST_EMAIL_KEY = 'lastAuthEmail'
const LAST_PHONE_KEY = 'lastAuthPhone'

export async function getLastAuthMethod(): Promise<AuthMethod | null> {
  const value = await AsyncStorage.getItem(LAST_METHOD_KEY)
  return value === 'email' || value === 'phone' ? value : null
}

export async function setLastAuthMethod(method: AuthMethod): Promise<void> {
  await AsyncStorage.setItem(LAST_METHOD_KEY, method)
}

export async function getLastUserId(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_USER_KEY)
}

export async function setLastUserId(userId: string): Promise<void> {
  await AsyncStorage.setItem(LAST_USER_KEY, userId)
}

export async function getLastEmail(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_EMAIL_KEY)
}

export async function setLastEmail(email: string): Promise<void> {
  await AsyncStorage.setItem(LAST_EMAIL_KEY, email)
}

export async function getLastPhone(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_PHONE_KEY)
}

export async function setLastPhone(phone: string): Promise<void> {
  await AsyncStorage.setItem(LAST_PHONE_KEY, phone)
}

export async function rememberAuthSuccess(params: {
  method: AuthMethod
  userId?: string
  email?: string
  phoneNumber?: string
}): Promise<void> {
  await setLastAuthMethod(params.method)
  if (params.userId) await setLastUserId(params.userId)
  if (params.email) await setLastEmail(params.email)
  if (params.phoneNumber) await setLastPhone(params.phoneNumber)
}
