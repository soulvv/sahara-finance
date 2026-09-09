import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Top } from "../components/layout/Top";
import { PageTransition } from "../motion/pageTransitions";
import { slideUp } from "../motion/variants";
import { useAuthStore } from "../hooks/useAuth";
import { useLang } from "../hooks/useLang";
import { useVoiceStore } from "../features/voice/VoiceContext";
import { SaathiChatModal } from "../components/chat/SaathiChatModal";
import { PhoneCallModal } from "../components/assistance/PhoneCallModal";
import { SaathiFrontDoor } from "../components/assistance/SaathiFrontDoor";
import {
  MessageSquare,
  Phone,
  Mic,
  Sparkles,
  ArrowRight,
  Camera,
  Check,
  LockKeyhole,
  Loader2,
  ScanLine,
  ShieldCheck,
  UserRound,
  UploadCloud,
  RefreshCw,
  X,
  HelpCircle,
} from "lucide-react";
import {
  getOnboardingSession,
  updateMyProfile,
  updateOnboardingProgress,
  submitPrivacyConsent,
  verifyDemoKycDocument,
} from "../lib/api";

export default function Onboarding() {
  const [, nav] = useLocation();
  const { user, updateUser, refreshProfile } = useAuthStore();
  const { lang, t } = useLang();

  const isHindi = lang === "hi";

  const [showFrontDoor, setShowFrontDoor] = useState(true);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.name || "");
  const [selectedDoc, setSelectedDoc] = useState<"AADHAAR" | "VOTER_ID" | "PAN">("AADHAAR");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedData, setVerifiedData] = useState<{
    maskedNumber?: string;
    verifiedName?: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Resume onboarding state from backend on mount
  useEffect(() => {
    let mounted = true;
    async function loadSession() {
      try {
        const res = await getOnboardingSession();
        if (!mounted) return;

        if (res.success && res.onboarding) {
          const { currentStep, completed, kycStatus } = res.onboarding;

          if (completed || kycStatus === "VERIFIED") {
            nav("/dashboard");
            return;
          }

          if (currentStep === "STEP_1_PRIVACY") {
            setStep(1);
            setShowFrontDoor(false);
          } else if (currentStep === "STEP_2_DOCUMENT") {
            setStep(2);
            setShowFrontDoor(false);
          } else {
            setStep(0);
          }
        }
      } catch (err) {
        console.warn("[Onboarding] Session load non-fatal:", err);
      } finally {
        if (mounted) setIsLoadingSession(false);
      }
    }

    loadSession();
    return () => {
      mounted = false;
    };
  }, [nav]);

  // Keep name synced if user store hydrates later
  useEffect(() => {
    if (user?.name && !name) {
      setName(user.name);
    }
  }, [user?.name, name]);

  // Clean up camera stream on unmount
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser environment.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
      toast.success(isHindi ? "कैमरा चालू हो गया है" : "Camera opened");
    } catch (err: any) {
      console.warn("[Camera] Camera access error:", err);
      setCameraError(
        isHindi
          ? "कैमरा खोलने में असमर्थ। कृपया फ़ोटो अपलोड करें या डेमो मोड का उपयोग करें।"
          : "Camera unavailable. You can upload a photo or use demo verification."
      );
      setIsCameraActive(false);
    }
  };

  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) {
      // Fallback simulation
      handleDocumentVerification();
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setCapturedImage(dataUrl);
    }

    stopCamera();
    handleDocumentVerification();
  };

  // Step 0: Save Name
  const handleNameSubmit = async () => {
    if (!name.trim()) {
      toast.error(isHindi ? "कृपया अपना नाम दर्ज करें" : "Please enter your name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateMyProfile({ name: name.trim() });
      if (res.success && res.user) {
        updateUser(res.user);
        await updateOnboardingProgress("STEP_1_PRIVACY");
        setStep(1);
        toast.success(isHindi ? "नाम सहेज लिया गया!" : "Name saved!");
      }
    } catch (err: any) {
      toast.error(err.message || (isHindi ? "नाम सहेजने में विफल" : "Failed to save name."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1: Privacy Consent
  const handleConsentSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await submitPrivacyConsent(true);
      if (res.success) {
        await updateOnboardingProgress("STEP_2_DOCUMENT");
        setStep(2);
        toast.success(isHindi ? "गोपनीयता प्रतिज्ञा स्वीकृत!" : "Privacy pledge accepted!");
      }
    } catch (err: any) {
      toast.error(err.message || (isHindi ? "प्रतिज्ञा दर्ज करने में विफल" : "Failed to record consent."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: KYC Verification
  const handleDocumentVerification = async () => {
    setIsVerifying(true);
    setIsSubmitting(true);
    try {
      const res = await verifyDemoKycDocument(selectedDoc);
      if (res.success) {
        setVerifiedData({
          maskedNumber: res.maskedNumber || "XXXX-XXXX-9230",
          verifiedName: res.verifiedName || name || "User",
        });
        await refreshProfile();
        toast.success(isHindi ? "केवाईसी सत्यापन सफल!" : "Demo KYC Verified!");
        setTimeout(() => {
          nav("/success?type=onboarding");
        }, 1500);
      }
    } catch (err: any) {
      toast.error(err.message || (isHindi ? "केवाईसी सत्यापन विफल" : "Verification failed."));
      setIsVerifying(false);
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step === 0) {
      handleNameSubmit();
    } else if (step === 1) {
      handleConsentSubmit();
    } else if (step === 2) {
      if (isCameraActive) {
        captureFrame();
      } else {
        handleDocumentVerification();
      }
    }
  };

  const stepTitles = [
    {
      title: isHindi ? "आपका नाम क्या है?" : "What is your name?",
      desc: isHindi ? "कृपया अपना पूरा नाम दर्ज करें जैसा पहचान पत्र पर है।" : "We’ll use this to greet you. You can say it aloud or type it below.",
    },
    {
      title: isHindi ? "आपकी सहमति आवश्यक है" : "Your permission is required",
      desc: isHindi ? "हम आपके वित्तीय डेटा को सुरक्षित रखने की प्रतिज्ञा करते हैं।" : "We’ll use your details only to show your financial information. You stay in control.",
    },
    {
      title: isHindi ? "पहचान पत्र (आधार कार्ड) सत्यापन" : "Identity Document Verification",
      desc: isHindi ? "कैमरे से अपना आधार कार्ड स्कैन करें या फ़ोटो अपलोड करें।" : "Keep your document flat, well-lit, and fully inside the frame.",
    },
  ];

  return (
    <PageTransition className="sahara-grain flex flex-1 flex-col h-full bg-[#f8f4eb]">
      <Top
        back
        title={
          showFrontDoor
            ? (isHindi ? "सहारा डिजिटल साथी" : "Sahara Saathi Assistant")
            : (isHindi ? `खाता सेटअप · ${step + 1}/3` : `Getting started · ${step + 1}/3`)
        }
        onBack={() => {
          if (showFrontDoor) {
            nav("/login");
          } else if (step > 0) {
            setStep(step - 1);
          } else {
            setShowFrontDoor(true);
          }
        }}
      />
      <div className="content-scroll flex flex-col relative overflow-hidden pb-10">
        <span className="signal-notch" />

        {showFrontDoor ? (
          <div className="mt-4">
            <SaathiFrontDoor
              onStartVoice={() => useVoiceStore.getState().setOpen(true)}
              onStartChat={() => setIsChatOpen(true)}
              onStartCall={() => setIsCallOpen(true)}
              onManualSetup={() => setShowFrontDoor(false)}
            />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#8b7c68]">
                {isHindi ? `चरण ${step + 1} / 3` : `Step ${step + 1} of 3`}
              </span>
              <button
                onClick={() => setShowFrontDoor(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#e07a5f]/15 text-[#e07a5f] hover:bg-[#e07a5f]/25 transition-colors"
              >
                <Sparkles size={13} />
                {isHindi ? "साथी सहायता" : "Saathi Help"}
              </button>
            </div>

            <motion.h1
              key={step}
              variants={slideUp}
              initial="initial"
              animate="animate"
              className="mt-3 text-3xl font-extrabold tracking-[-.04em] relative z-10 text-[#17324d]"
            >
              {stepTitles[step].title}
            </motion.h1>
            <motion.p
              key={`sub-${step}`}
              variants={slideUp}
              initial="initial"
              animate="animate"
              className="mt-2 leading-6 text-[#66717b] relative z-10 text-sm"
            >
              {stepTitles[step].desc}
            </motion.p>

            {/* Assisted Onboarding Quick Bar */}
            <motion.div
              variants={slideUp}
              className="mt-4 rounded-2xl border border-[#e6a62d]/50 bg-[#fff9e9] p-3.5 flex items-center justify-between shadow-sm relative z-10"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#e6a62d] text-[#17324d] flex items-center justify-center font-bold text-xs shadow-sm">
                  <Sparkles size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#17324d]">
                    {isHindi ? "बोलकर या चैट से मदद चाहिए?" : "Need help setting up?"}
                  </div>
                  <div className="text-[11px] text-[#8b7c68]">
                    {isHindi ? "सहारा साथी आपकी आवाज़ से मदद करेगा" : "Saathi will guide you step-by-step"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => useVoiceStore.getState().setOpen(true)}
                  title="Talk to Saathi"
                  className="p-2 rounded-xl bg-white border border-[#e2d5c3] text-[#17324d] hover:bg-[#faf4e6] hover:text-[#e07a5f] transition-all text-xs font-semibold flex items-center gap-1 shadow-sm"
                >
                  <Mic size={14} /> {isHindi ? "आवाज़" : "Voice"}
                </button>
                <button
                  onClick={() => setIsChatOpen(true)}
                  title="Chat with Saathi"
                  className="p-2 rounded-xl bg-white border border-[#e2d5c3] text-[#17324d] hover:bg-[#faf4e6] hover:text-[#e07a5f] transition-all text-xs font-semibold flex items-center gap-1 shadow-sm"
                >
                  <MessageSquare size={14} /> {isHindi ? "चैट" : "Chat"}
                </button>
                <button
                  onClick={() => setIsCallOpen(true)}
                  title="Request a Phone Call"
                  className="p-2 rounded-xl bg-white border border-[#e2d5c3] text-[#17324d] hover:bg-[#faf4e6] hover:text-[#2b6e56] transition-all text-xs font-semibold flex items-center gap-1 shadow-sm"
                >
                  <Phone size={14} />
                </button>
              </div>
            </motion.div>
          </>
        )}

        {/* Step 0: Name Input */}
        {step === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-[24px] border border-[#e4dccd] bg-[#fffdf8] p-5 shadow-sm relative z-10"
          >
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e9f0ea] text-[#3c6f53] shadow-sm">
              <UserRound size={24} />
            </div>
            <label className="mt-5 block text-xs font-bold uppercase tracking-wider text-[#8b7c68]">
              {isHindi ? "आपका पूरा नाम" : "Your full name"}
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNext()}
              disabled={isSubmitting || isLoadingSession}
              placeholder={isHindi ? "उदा. अनन्य शर्मा" : "e.g. Ananya Sharma"}
              className="mt-2 min-h-[54px] w-full rounded-2xl border border-[#d9cfbe] bg-[#f8f4eb] px-4 text-lg font-bold text-[#17324d] outline-none focus:border-[#e6a62d] focus:bg-[#fffdf8] transition-all disabled:opacity-50"
            />
            <p className="mt-3 text-xs text-[#8b7c68]">
              {isHindi
                ? "सुझाव: आप साथी से बोलकर भी अपना नाम दर्ज करवा सकते हैं।"
                : "Voice tip: You can also say your name when OmniDimension prompts you."}
            </p>
          </motion.div>
        )}

        {/* Step 1: Privacy Pledge */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-[24px] border border-[#e4dccd] bg-[#fffdf8] p-5 shadow-sm relative z-10 space-y-4"
          >
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e9f0ea] text-[#3c6f53] shadow-sm">
              <ShieldCheck size={24} />
            </div>
            <div className="rounded-xl bg-[#fff9e9] border border-[#e6a62d]/40 p-4 text-xs text-[#17324d] leading-5">
              <span className="font-bold text-sm text-[#17324d]">
                {isHindi ? "सहारा सुरक्षा और गोपनीयता प्रतिज्ञा:" : "Your Privacy Pledge:"}
              </span>
              <ul className="mt-2 list-disc list-inside space-y-1.5 text-[#66717b]">
                <li>{t.pledge1Desc}</li>
                <li>{t.pledge2Desc}</li>
                <li>{t.pledge3Desc}</li>
              </ul>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-[#8b7c68]">
              <LockKeyhole size={16} className="shrink-0 text-[#b37b12] mt-0.5" />
              <span>
                {isHindi
                  ? "256-बिट बैंक-ग्रेड एन्क्रिप्शन और अपरिवर्तनीय ऑडिट लॉगिंग द्वारा सुरक्षित।"
                  : "Encrypted with bank-grade 256-bit security & immutable audit logging."}
              </span>
            </div>
          </motion.div>
        )}

        {/* Step 2: Live Camera & KYC Verification */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 relative z-10 space-y-3"
          >
            {/* Document Type Selector Tabs */}
            <div className="flex gap-2">
              {(["AADHAAR", "VOTER_ID", "PAN"] as const).map((doc) => (
                <button
                  key={doc}
                  type="button"
                  onClick={() => setSelectedDoc(doc)}
                  disabled={isSubmitting || verifiedData !== null}
                  className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all border shadow-sm ${
                    selectedDoc === doc
                      ? "bg-[#17324d] text-[#e6a62d] border-[#17324d]"
                      : "bg-[#fffdf8] text-[#66717b] border-[#e4dccd]"
                  }`}
                >
                  {doc === "AADHAAR" ? (isHindi ? "आधार कार्ड" : "Aadhaar") : doc === "VOTER_ID" ? (isHindi ? "वोटर कार्ड" : "Voter ID") : "PAN"}
                </button>
              ))}
            </div>

            {/* Viewfinder / Live Camera Screen */}
            <div className="relative overflow-hidden rounded-[26px] border-2 border-dashed border-[#e6a62d] bg-[#17324d] p-4 text-[#fffdf8] shadow-md min-h-[260px] flex flex-col items-center justify-center">
              {/* Corner guide markers */}
              <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-[#e6a62d] rounded-tl-lg z-20" />
              <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-[#e6a62d] rounded-tr-lg z-20" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-[#e6a62d] rounded-bl-lg z-20" />
              <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-[#e6a62d] rounded-br-lg z-20" />

              {/* Hidden Canvas for Snapshot Capture */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Active Live Video Stream */}
              {isCameraActive && (
                <div className="absolute inset-0 z-10 overflow-hidden rounded-[24px]">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Animated laser scan line */}
                  <motion.div
                    className="absolute left-4 right-4 h-[3px] bg-gradient-to-r from-transparent via-[#2ec4b6] to-transparent shadow-[0_0_12px_#2ec4b6]"
                    animate={{ top: ["10%", "85%", "10%"] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <div className="absolute bottom-3 left-0 right-0 text-center">
                    <span className="inline-block rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white">
                      {isHindi ? "आधार कार्ड को फ्रेम के अंदर सीधा रखें" : "Keep card aligned inside frame"}
                    </span>
                  </div>
                </div>
              )}

              {/* Captured Image Preview */}
              {capturedImage && !isCameraActive && (
                <div className="absolute inset-0 z-10 overflow-hidden rounded-[24px]">
                  <img
                    src={capturedImage}
                    alt="Captured Aadhaar Document"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* UI States inside Viewfinder */}
              {verifiedData ? (
                <div className="flex flex-col items-center gap-2 py-4 z-30">
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-[#5b936d] text-white shadow-lg">
                    <Check size={32} />
                  </div>
                  <span className="font-extrabold text-sm text-[#bfe0c4]">
                    {isHindi ? "केवाईसी सत्यापित हुआ!" : "Demo KYC Verified!"}
                  </span>
                  <span className="font-mono text-xs text-[#e6a62d] bg-black/40 px-2.5 py-1 rounded-md">
                    {verifiedData.maskedNumber}
                  </span>
                </div>
              ) : isVerifying ? (
                <div className="flex flex-col items-center gap-3 text-center py-4 z-30 bg-black/40 backdrop-blur-sm p-4 rounded-xl">
                  <Loader2 className="animate-spin text-[#e6a62d]" size={36} />
                  <div>
                    <div className="text-sm font-bold text-white">
                      {isHindi ? "दस्तावेज़ का सत्यापन हो रहा है..." : "Verifying document..."}
                    </div>
                    <div className="text-xs text-[#cbd8df] mt-0.5">
                      {isHindi ? "पहचान पत्र की सुरक्षा जांच" : "Checking document authenticity"}
                    </div>
                  </div>
                </div>
              ) : !isCameraActive && !capturedImage ? (
                <div className="flex flex-col items-center gap-3 text-center py-3 z-10">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-[#e6a62d]">
                    <ScanLine size={28} />
                  </div>
                  <div>
                    <div className="text-base font-extrabold text-white">
                      {selectedDoc === "AADHAAR"
                        ? (isHindi ? "आधार कार्ड सत्यापन" : "Aadhaar Card Scan")
                        : selectedDoc === "VOTER_ID"
                          ? (isHindi ? "वोटर आईडी कार्ड" : "Voter ID Card")
                          : "PAN Card"}
                    </div>
                    <div className="text-xs text-[#cbd8df] mt-1">
                      {isHindi ? "कैमरा चालू करके फ़ोटो खींचें" : "Open live camera or upload photo"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={startCamera}
                    className="mt-2 flex items-center gap-2 rounded-xl bg-[#e6a62d] px-4 py-2 text-xs font-extrabold text-[#17324d] shadow-sm hover:bg-[#f0b540] active:scale-95 transition-all"
                  >
                    <Camera size={16} /> {isHindi ? "कैमरा खोलें" : "Open Camera"}
                  </button>
                </div>
              ) : null}
            </div>

            {/* Error Message */}
            {cameraError && (
              <div className="rounded-xl bg-[#fdf2f0] border border-[#f3dfd8] p-3 text-xs text-[#b65c4a] font-medium flex items-center gap-2">
                <span>{cameraError}</span>
              </div>
            )}

            {/* Camera Controls Bar */}
            {isCameraActive && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#d9cfbe] bg-[#fffdf8] text-xs font-bold text-[#66717b] shadow-sm"
                >
                  <X size={15} /> {isHindi ? "कैमरा बंद करें" : "Close Camera"}
                </button>
                <button
                  type="button"
                  onClick={captureFrame}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#2b6e56] text-white text-xs font-extrabold shadow-sm active:scale-95 transition-transform"
                >
                  <Camera size={15} /> {isHindi ? "फ़ोटो लें" : "Capture Photo"}
                </button>
              </div>
            )}

            <div className="text-center text-[11px] text-[#8b7c68] pt-1">
              {isHindi
                ? "डेमो मोड · हैकाथॉन प्रोटोटाइप के लिए सिम्युलेटेड सत्यापन"
                : "Demo Mode · In-memory simulated verification for evaluation"}
            </div>
          </motion.div>
        )}

        {/* Primary Action Button */}
        <div className="mt-auto pt-6">
          <button
            className="primary-button w-full flex items-center justify-center gap-2 font-bold shadow-md active:scale-[0.98] transition-transform"
            disabled={isSubmitting || isLoadingSession || (step === 0 && !name.trim())}
            onClick={handleNext}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                {step === 0
                  ? (isHindi ? "सहेज रहे हैं..." : "Saving name...")
                  : step === 1
                    ? (isHindi ? "प्रतिज्ञा दर्ज हो रही है..." : "Recording consent...")
                    : (isHindi ? "सत्यापन हो रहा है..." : "Verifying document...")}
              </>
            ) : step === 0 ? (
              <>
                {isHindi ? "आगे बढ़ें" : "Continue"} <ArrowRight size={18} />
              </>
            ) : step === 1 ? (
              <>
                <Check size={18} /> {isHindi ? "प्रतिज्ञा स्वीकार करें" : "Accept & Proceed"}
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                {isCameraActive
                  ? (isHindi ? "कैप्चर और सत्यापित करें" : "Capture & Verify")
                  : (isHindi ? "सत्यापन पूर्ण करें" : "Complete Verification")}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Saathi AI Modals */}
      <SaathiChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
      <PhoneCallModal
        isOpen={isCallOpen}
        onClose={() => setIsCallOpen(false)}
      />
    </PageTransition>
  );
}
