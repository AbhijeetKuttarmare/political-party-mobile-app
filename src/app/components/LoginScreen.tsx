import { useState } from "react";
import { useLocation, Navigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Phone, Shield, Lock, ArrowRight,
  ChevronLeft, RotateCcw, AlertCircle, CheckCircle2, Loader,
} from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./ui/input-otp";
import { useAuth } from "../context/AuthContext";
import ncpLogo from "../../imports/image.png";

type Step = "phone" | "otp";

const ROLE_LABELS: Record<string, string> = {
  state_leader:    "State Leader",
  district_leader: "District Leader",
  taluka_leader:   "Taluka Leader",
  village_leader:  "Village Leader",
  booth_leader:    "Booth Leader",
  booth_worker:    "Booth Worker",
  karyakarta:      "Karyakarta",
  observer:        "Observer",
};

const WEB_ROLES = ["super_admin", "state_leader", "district_leader", "observer"];

export default function LoginScreen() {
  const location    = useLocation();
  const { login, isLoggedIn, user } = useAuth();
  const from        = (location.state as any)?.from?.pathname || "/";

  const [step,    setStep]    = useState<Step>("phone");
  const [phone,   setPhone]   = useState("");
  const [otp,     setOtp]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  /* ── Step 1: Send OTP ───────────────────────────────────────── */
  const handleSendOTP = async () => {
    if (phone.length !== 10) return;
    setError("");
    setLoading(true);

    // Simulate OTP sending delay (300ms)
    await new Promise(r => setTimeout(r, 300));

    setOtpSent(true);
    setStep("otp");
    setLoading(false);

    // Start 30-second resend countdown
    setResendCountdown(30);
    const interval = setInterval(() => {
      setResendCountdown(c => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  /* ── Step 2: Verify OTP + Login ─────────────────────────────── */
  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return;
    setError("");
    setLoading(true);

    const DEMO_NUMBERS = [
      "8888888888", "9999999999", "7777777777", "6666666666", // web roles
      "5555555555", "4444444444", "3333333333", "2222222222", "1111111111", // mobile roles
    ];

    try {
      /* ── For known demo numbers: use demo-login (real JWT, no password) */
      if (DEMO_NUMBERS.includes(phone)) {
        const res = await fetch("/api/auth/demo-login", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ mobile: phone }),
          signal:  AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const data = await res.json();
          login(data.user, data.token);
          return;
        }
        // Backend not running → fall through to demo mode below
      } else {
        /* ── Normal login for real users ──────────────────────── */
        const res = await fetch("/api/auth/login", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ mobile: phone, password: "Admin@123" }),
          signal:  AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const data = await res.json();
          login(data.user, data.token);
          return;
        }
      }
    } catch {
      // Backend not running → fall through to offline demo mode
    }

    /* ── Offline demo mode (backend down): any 6-digit OTP works ── */
    const demoRoleMap: Record<string, string> = {
      "8888888888": "super_admin",
      "9999999999": "state_leader",
      "7777777777": "district_leader",
      "6666666666": "observer",
      "5555555555": "taluka_leader",
      "4444444444": "village_leader",
      "3333333333": "booth_leader",
      "2222222222": "booth_worker",
      "1111111111": "karyakarta",
    };
    const demoRole = demoRoleMap[phone] ?? "karyakarta";
    login({
      name:   `Demo ${demoRole.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`,
      mobile: phone,
      role:   demoRole,
      isDemo: true,
    });
  };

  const handleResendOTP = () => {
    if (resendCountdown > 0) return;
    setOtp("");
    setError("");
    setResendCountdown(30);
    const interval = setInterval(() => {
      setResendCountdown(c => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  /* ── If already logged in, redirect to web or mobile ──────────── */
  if (isLoggedIn) {
    const dest = WEB_ROLES.includes(user?.role ?? "") ? "/web" : from;
    return <Navigate to={dest} replace />;
  }

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#001a4d]">

      {/* ── Hero Section ── */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 pb-8 overflow-hidden">

        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-60px] left-1/2 -translate-x-1/2 w-[340px] h-[340px] bg-blue-700/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-orange-600/15 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-green-700/15 rounded-full blur-2xl" />
        </div>

        {/* Tricolor dots */}
        <div className="absolute top-6 right-6 flex flex-col gap-1">
          {["bg-orange-500","bg-white/40","bg-green-500"].map(c => (
            <div key={c} className={`w-2 h-2 rounded-full ${c} opacity-70`} />
          ))}
        </div>

        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1,   opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          className="relative z-10 mb-5"
        >
          <div className="w-[100px] h-[100px] rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-2.5 shadow-2xl">
            <img src={ncpLogo} alt="NCP-SP Logo" className="w-full h-full object-contain rounded-xl" />
          </div>
          <span className="absolute -bottom-2 -right-2 flex h-5 w-5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50 animate-ping" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-green-400" />
          </span>
        </motion.div>

        {/* Party name */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0,  opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative z-10 text-center space-y-1"
        >
          <h1 className="text-white font-black text-xl tracking-wide leading-tight">
            Nationalist Congress Party
          </h1>
          <div className="flex mx-auto w-fit">
            <div className="h-[3px] w-10 bg-orange-500 rounded-l-full" />
            <div className="h-[3px] w-10 bg-white/80" />
            <div className="h-[3px] w-10 bg-green-500 rounded-r-full" />
          </div>
          <p className="text-blue-200 text-sm font-semibold pt-1">Sharadchandra Pawar</p>
        </motion.div>

        {/* Badge */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0,  opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="relative z-10 mt-4 flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5"
        >
          <Shield size={12} className="text-orange-400" />
          <span className="text-[11px] font-bold text-white/90 tracking-widest uppercase">Official Member Portal</span>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        </motion.div>
      </div>

      {/* ── Form Card ── */}
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0,  opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.15 }}
        className="relative bg-white rounded-t-[32px] px-6 pt-7 pb-8 shadow-2xl"
        style={{ minHeight: "54%" }}
      >
        {/* Handle bar */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-200 rounded-full" />

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <AlertCircle size={15} className="text-red-500 shrink-0" />
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">

          {/* ── STEP 1: Phone ── */}
          {step === "phone" && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div className="space-y-0.5">
                <h2 className="text-2xl font-black text-gray-900">Welcome Back</h2>
                <p className="text-sm text-gray-500">Sign in to your member account</p>
              </div>

              {/* Phone input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 tracking-wider uppercase">
                  Mobile Number
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center justify-center w-20 h-13 rounded-2xl border-2 border-gray-100 bg-gray-50 shrink-0">
                    <span className="text-sm font-black text-gray-700">🇮🇳 +91</span>
                  </div>
                  <div className="relative flex-1">
                    <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      maxLength={10}
                      className="w-full h-13 pl-9 pr-10 rounded-2xl border-2 border-gray-100 bg-gray-50 text-gray-900 font-bold text-base focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:font-normal placeholder:text-gray-400"
                    />
                    {phone.length === 10 && (
                      <CheckCircle2 size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-green-500" />
                    )}
                  </div>
                </div>
              </div>

              {/* Demo hint */}
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                <Shield size={13} className="text-blue-400 shrink-0 mt-0.5" />
                <div className="w-full">
                  <p className="text-[11px] font-bold text-blue-600 mb-1">Demo Numbers (enter any 6-digit OTP)</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                    {[
                      ["8888888888", "Super Admin"],
                      ["9999999999", "State Leader"],
                      ["7777777777", "District Leader"],
                      ["6666666666", "Observer"],
                      ["5555555555", "Taluka Leader"],
                      ["4444444444", "Village Leader"],
                      ["3333333333", "Booth Leader"],
                      ["2222222222", "Booth Worker"],
                      ["1111111111", "Karyakarta"],
                    ].map(([num, role]) => (
                      <p key={num} className="text-[10px] text-blue-500">
                        <span className="font-bold">{num}</span> · {role}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={handleSendOTP}
                disabled={phone.length !== 10 || loading}
                className="w-full h-13 flex items-center justify-center gap-2 rounded-2xl bg-[#001a4d] text-white font-bold text-base shadow-lg shadow-blue-900/30 hover:bg-blue-900 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading
                  ? <Loader size={18} className="animate-spin" />
                  : <><Lock size={16} />Send OTP<ArrowRight size={16} /></>
                }
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400 font-medium">256-bit SSL encrypted</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === "otp" && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Back + heading */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <ChevronLeft size={18} className="text-gray-700" />
                </button>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Verify OTP</h2>
                  <p className="text-xs text-gray-500">
                    Sent to <span className="font-bold text-gray-700">+91 {phone}</span>
                  </p>
                </div>
              </div>

              {/* OTP icon */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#001a4d] to-blue-700 flex items-center justify-center shadow-xl shadow-blue-900/30">
                    <Lock size={28} className="text-white" />
                  </div>
                  {otpSent && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50 animate-ping" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-green-400" />
                    </span>
                  )}
                </div>
              </div>

              {/* OTP demo hint */}
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                <Shield size={12} className="text-amber-500 shrink-0" />
                <p className="text-[11px] text-amber-600 font-medium">
                  Demo mode — enter any 6-digit number (e.g. <span className="font-black">123456</span>)
                </p>
              </div>

              {/* OTP slots */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 tracking-wider uppercase block text-center">
                  6-Digit Verification Code
                </label>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={v => { setOtp(v); setError(""); }}>
                    <InputOTPGroup className="gap-2">
                      {[0,1,2,3,4,5].map(i => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="w-11 h-13 text-lg font-black rounded-xl border-2 border-gray-100 bg-gray-50 focus:border-blue-500 focus:bg-white transition-all"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              {/* Verify CTA */}
              <button
                onClick={handleVerifyOTP}
                disabled={otp.length !== 6 || loading}
                className="w-full h-13 flex items-center justify-center gap-2 rounded-2xl bg-green-600 text-white font-bold text-base shadow-lg shadow-green-700/30 hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading
                  ? <Loader size={18} className="animate-spin" />
                  : <><Shield size={16} />Verify &amp; Enter Portal<ArrowRight size={16} /></>
                }
              </button>

              {/* Resend */}
              <div className="text-center">
                <button
                  onClick={handleResendOTP}
                  disabled={resendCountdown > 0}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors disabled:opacity-40 text-gray-500 hover:text-blue-700 disabled:hover:text-gray-500"
                >
                  <RotateCcw size={13} />
                  {resendCountdown > 0
                    ? `Resend in ${resendCountdown}s`
                    : "Resend OTP"
                  }
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-[10px] text-gray-400 mt-5">
          © 2025 NCP-Sharadchandra Pawar · Secure Member Portal
        </p>
      </motion.div>
    </div>
  );
}
