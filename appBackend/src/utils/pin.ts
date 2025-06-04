import bcrypt from 'bcryptjs';

export const hashPin = async (pin: string): Promise<string> => {
  return bcrypt.hash(pin, 10);
};

export const verifyPin = async (pin: string, hashedPin: string): Promise<boolean> => {
  return bcrypt.compare(pin, hashedPin);
}; 