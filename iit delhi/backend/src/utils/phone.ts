/**
 * Validates and normalizes Indian mobile numbers into standard E.164-like format: +91XXXXXXXXXX
 */
export function normalizePhoneNumber(rawPhone: string): {
  valid: boolean;
  phone: string;
  error?: string;
} {
  if (!rawPhone || typeof rawPhone !== "string") {
    return { valid: false, phone: "", error: "Phone number is required." };
  }

  // Strip all non-digit characters except leading +
  const digitsOnly = rawPhone.replace(/\D/g, "");

  // If 10 digits (e.g. 9876543210)
  if (digitsOnly.length === 10) {
    // Valid Indian mobile numbers start with 6, 7, 8, or 9
    if (/^[6-9]\d{9}$/.test(digitsOnly)) {
      return { valid: true, phone: `+91${digitsOnly}` };
    }
    return {
      valid: false,
      phone: "",
      error: "Please enter a valid 10-digit Indian mobile number starting with 6-9.",
    };
  }

  // If 12 digits with 91 prefix (e.g. 919876543210)
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    const mobilePart = digitsOnly.slice(2);
    if (/^[6-9]\d{9}$/.test(mobilePart)) {
      return { valid: true, phone: `+91${mobilePart}` };
    }
  }

  return {
    valid: false,
    phone: "",
    error: "Please enter a valid 10-digit Indian mobile number.",
  };
}
