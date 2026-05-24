import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Phone, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./ui/input-otp";

export default function SignupScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"details" | "otp">("details");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    state: "",
  });
  const [otp, setOtp] = useState("");

  const handleSendOTP = () => {
    if (formData.name && formData.phone.length === 10 && formData.state) {
      setStep("otp");
    }
  };

  const handleVerifyOTP = () => {
    if (otp.length === 6) {
      localStorage.setItem("isLoggedIn", "true");
      navigate("/");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 max-w-md mx-auto relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-pink-400/20 to-blue-400/20 rounded-full blur-3xl"></div>
      
      {/* Header */}
      <div className="p-6 text-center relative z-10 mt-8">
        <div className="w-24 h-24 bg-white rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-xl p-2">
          <img src="/src/imports/image.png" alt="NCP-SP" className="w-full h-full object-contain" />
        </div>
        <h1 className="font-bold text-2xl mb-1 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent leading-tight">Join NCP-SP</h1>
        <p className="text-xs text-orange-600 font-semibold mb-2">Nationalist Congress Party - Sharadchandra Pawar</p>
        <p className="text-sm text-gray-600 flex items-center justify-center gap-1">
          <Sparkles size={14} className="text-blue-500" />
          Create your member account
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 relative z-10 overflow-y-auto">
        {step === "details" ? (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="font-bold text-2xl mb-2">Sign Up</h2>
              <p className="text-sm text-gray-600">
                Enter your details to get started
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-3 block">
                    Full Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="h-12 border-2 border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-3 block">
                    Mobile Number
                  </label>
                  <div className="flex gap-3">
                    <div className="w-16 h-12 border-2 border-gray-200 rounded-xl flex items-center justify-center bg-gray-50">
                      <span className="text-sm font-semibold text-gray-700">+91</span>
                    </div>
                    <Input
                      type="tel"
                      placeholder="Enter 10-digit number"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      maxLength={10}
                      className="flex-1 h-12 border-2 border-gray-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-3 block">
                    State/UT
                  </label>
                  <Input
                    type="text"
                    placeholder="Select your state"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                    className="h-12 border-2 border-gray-200 rounded-xl"
                  />
                </div>

                <Button
                  onClick={handleSendOTP}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 rounded-xl font-semibold shadow-lg"
                >
                  <Phone size={18} className="mr-2" />
                  Send OTP
                </Button>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link to="/login" className="text-blue-600 font-semibold">
                  Login
                </Link>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="font-bold text-2xl mb-2">Verify OTP</h2>
              <p className="text-sm text-gray-600">
                Enter the 6-digit code sent to<br />
                <span className="font-semibold text-gray-800">+91 {formData.phone}</span>
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100">
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-3 block text-center">
                    Enter OTP Code
                  </label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={(value) => setOtp(value)}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} className="w-12 h-14 text-lg font-bold rounded-xl border-2" />
                        <InputOTPSlot index={1} className="w-12 h-14 text-lg font-bold rounded-xl border-2" />
                        <InputOTPSlot index={2} className="w-12 h-14 text-lg font-bold rounded-xl border-2" />
                        <InputOTPSlot index={3} className="w-12 h-14 text-lg font-bold rounded-xl border-2" />
                        <InputOTPSlot index={4} className="w-12 h-14 text-lg font-bold rounded-xl border-2" />
                        <InputOTPSlot index={5} className="w-12 h-14 text-lg font-bold rounded-xl border-2" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <Button
                  onClick={handleVerifyOTP}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 rounded-xl font-semibold shadow-lg"
                >
                  Verify & Create Account
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setStep("details")}
                  className="w-full h-12 rounded-xl font-semibold"
                >
                  Change Details
                </Button>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Didn't receive code?{" "}
                <button className="text-blue-600 font-semibold">Resend OTP</button>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 text-center relative z-10">
        <p className="text-xs text-gray-500">
          By signing up, you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
}