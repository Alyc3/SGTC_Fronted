import * as Crypto from "expo-crypto";

export const hashPassword = async (plainPassword: string): Promise<string> => {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    plainPassword,
  );
};

export const verifyPassword = async (
  plainPassword: string,
  storedHash: string,
): Promise<boolean> => {
  if (!storedHash || storedHash === "API_NO_PASSWORD") return false;
  const inputHash = await hashPassword(plainPassword);
  return inputHash === storedHash;
};
