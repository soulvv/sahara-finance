/**
 * Screen Explanation Service (Phase 2 — Multilingual AI Financial Copilot)
 * "Explain this screen" endpoint delivering localized plain-language explanations.
 * Never invents financial data; uses contextual parameters.
 */

export interface ScreenExplanation {
  screen: string;
  language: "hi" | "hinglish" | "en";
  title: string;
  summary: string;
  keyPoints: string[];
  suggestedVoicePrompt: string;
}

const SCREEN_EXPLANATIONS: Record<string, Record<string, { title: string; summary: string; keyPoints: string[]; suggestedVoicePrompt: string }>> = {
  dashboard: {
    hi: {
      title: "आपकी खाता स्क्रीन",
      summary: "यह आपका मुख्य पृष्ठ है। यहाँ आपका कुल सुरक्षित खर्च (Safe-to-Spend), बचत और हालिया लेन-देन दिखते हैं।",
      keyPoints: [
        "ऊपर आपका सुरक्षित खर्च बैलेंस है जो बिल और क़िस्त हटाने के बाद बचता है।",
        "नीचे हालिया लेन-देन की सूची है।",
        "माइक दबाकर आप बोलकर पैसे भेज सकते हैं या बैलेंस पूछ सकते हैं।",
      ],
      suggestedVoicePrompt: "मेरा बैलेंस कितना है?",
    },
    hinglish: {
      title: "Aapka Dashboard Screen",
      summary: "Yeh aapka main screen hai jahan Safe-to-Spend balance, recent transactions, aur quick actions dikhte hain.",
      keyPoints: [
        "Safe-to-Spend wo balance hai jo agle EMI aur bills ke baad aap kharch kar sakte hain.",
        "Transactions mein aapke saare credits aur debits hain.",
        "Mic tap karke aap bol sakte hain jaise '500 rupaye bhejo'.",
      ],
      suggestedVoicePrompt: "Safe to spend kitna bacha hai?",
    },
    en: {
      title: "Your Account Dashboard",
      summary: "This is your main dashboard displaying your Safe-to-Spend balance, recent transactions, and voice actions.",
      keyPoints: [
        "Safe-to-Spend accounts for upcoming bills and loan EMIs before giving you a safe balance.",
        "Recent transactions display your credits and debits.",
        "Tap the microphone to issue voice commands in Hindi, Hinglish, or English.",
      ],
      suggestedVoicePrompt: "What is my safe to spend balance?",
    },
  },
  safetospend: {
    hi: {
      title: "सुरक्षित खर्च (Safe-to-Spend) क्या है?",
      summary: "यह केवल आपका बैंक बैलेंस नहीं है। यह वह रकम है जिसे आप बिना किसी आगामी बिल या लोन क़िस्त की चिंता किए खर्च कर सकते हैं।",
      keyPoints: [
        "आगामी लोन EMI पहले से आरक्षित कर दी गई है।",
        "बिजली/पानी बिल का अनुमानित हिस्सा सुरक्षित रखा गया है।",
        "आपातकालीन बचत फंड को भी अलग रखा गया है।",
      ],
      suggestedVoicePrompt: "मेरी अगली क़िस्त कब है?",
    },
    hinglish: {
      title: "Safe-to-Spend Explained",
      summary: "Yeh balance aapke total balance mein se EMI aur zaroori bills ko minus karke dikhata hai taaki aap overspend na karein.",
      keyPoints: [
        "Upcoming loan EMI already reserve ho chuki hai.",
        "Bills aur emergency fund alag rakha gaya hai.",
        "Jo bacha hai, wo bina tension kharch kar sakte hain.",
      ],
      suggestedVoicePrompt: "Mera EMI amount kitna katega?",
    },
    en: {
      title: "Understanding Safe-to-Spend",
      summary: "Safe-to-Spend deducts your upcoming loan EMIs, estimated utility bills, and emergency reserves from your total balance.",
      keyPoints: [
        "Guarantees you never default on your loan repayment.",
        "Protects money needed for electricity and basic utilities.",
        "Shows only real disposable funds so you never overdraw.",
      ],
      suggestedVoicePrompt: "How much can I safely spend this week?",
    },
  },
  pay: {
    hi: {
      title: "सुरक्षित भुगतान स्क्रीन",
      summary: "यहाँ आप किसी भी दुकानदार या व्यक्ति को यूपीआई (UPI) या फ़ोन नंबर से सुरक्षित पैसे भेज सकते हैं।",
      keyPoints: [
        "दुकानदार का नाम और सही पता यहाँ सत्यापित होता है।",
        "भुगतान करने से पहले आपको पूरा ब्यौरा दिखाया जाएगा।",
        "बिना आपकी अनुमति के कोई राशि नहीं काटी जाएगी।",
      ],
      suggestedVoicePrompt: "राहुल को 200 रुपये भेजो",
    },
    hinglish: {
      title: "Payment Screen",
      summary: "Yahan aap UPI ID ya phone number daal kar securely paise bhej sakte hain.",
      keyPoints: [
        "Merchant ka naam verify kiya jaata hai taaki galat payment na ho.",
        "Safe slider swipe karne par hi payment execute hoti hai.",
        "Har transaction ki raseed turant milti hai.",
      ],
      suggestedVoicePrompt: "Verify merchant Rahul General Store",
    },
    en: {
      title: "Secure Payment Screen",
      summary: "Enter a phone number or UPI ID to initiate a verified payment with physical confirmation.",
      keyPoints: [
        "Recipient identity is verified before any funds leave your account.",
        "Requires conscious slider interaction or biometric/PIN confirmation.",
        "Cryptographic receipt generated instantly upon completion.",
      ],
      suggestedVoicePrompt: "Pay 500 to Rahul General Store",
    },
  },
  loan: {
    hi: {
      title: "माइक्रो-लोन और क़िस्त विवरण",
      summary: "यहाँ आप अपने छोटे व्यवसाय या निजी काम के लिए लिए गए लोन और उसकी मासिक क़िस्त देख सकते हैं।",
      keyPoints: [
        "आपकी बची हुई क़िस्त और उसकी आखिरी तारीख स्पष्ट दिखती है।",
        "समय पर भुगतान करने से आपका स्वास्थ्य स्कोर बेहतर होता है।",
        "एक क्लिक में सुरक्षित तरीक़े से क़िस्त चुकाई जा सकती है।",
      ],
      suggestedVoicePrompt: "मेरी लोन क़िस्त चुकाओ",
    },
    hinglish: {
      title: "Micro-Loan & EMI Repayment",
      summary: "Yahan aapka active loan, repayment schedule, aur remaining balance dikhta hai.",
      keyPoints: [
        "Loan repayment schedule mein PAID aur DUE status transparent hai.",
        "Repay button dabane se safe payment ledger mein update hoti hai.",
        "Hidden interest ya hidden charges nahi hain.",
      ],
      suggestedVoicePrompt: "Mere kitne installment baaki hain?",
    },
    en: {
      title: "Micro-Loan & EMI Schedule",
      summary: "View transparent micro-loan balances, upcoming installments, and direct one-tap repayment options.",
      keyPoints: [
        "Clear schedule showing completed and upcoming installments.",
        "Zero hidden fees; interest rates and totals are pre-calculated.",
        "Timely repayments boost your financial wellness score.",
      ],
      suggestedVoicePrompt: "Pay my next loan installment",
    },
  },
};

export class ExplainScreenService {
  public static getExplanation(screen: string, lang: string = "hi"): ScreenExplanation {
    const screenKey = screen.toLowerCase().replace(/[^a-z]/g, "");
    const selectedLang: "hi" | "hinglish" | "en" =
      lang === "en" ? "en" : lang === "hinglish" ? "hinglish" : "hi";

    const screenData =
      SCREEN_EXPLANATIONS[screenKey] || SCREEN_EXPLANATIONS["dashboard"];
    const content = screenData[selectedLang] || screenData["hi"];

    return {
      screen: screenKey,
      language: selectedLang,
      title: content.title,
      summary: content.summary,
      keyPoints: content.keyPoints,
      suggestedVoicePrompt: content.suggestedVoicePrompt,
    };
  }
}
