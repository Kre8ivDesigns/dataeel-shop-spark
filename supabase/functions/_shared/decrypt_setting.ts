/** Decrypt values stored by manage-app-settings (AES-256-GCM, base64 payload). */

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return bytes;
}

async function importKey(keyHex: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", hexToBytes(keyHex.slice(0, 64)), { name: "AES-GCM" }, false, ["decrypt"]);
}

export async function decryptSettingValue(b64: string, keyHex: string): Promise<string> {
  const key = await importKey(keyHex);
  const combined = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: combined.slice(0, 12) }, key, combined.slice(12));
  return new TextDecoder().decode(decrypted);
}
