import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, Navigation, Loader, CheckCircle2, ChevronDown, X, AlertCircle } from "lucide-react";
import { useUserLocation } from "../context/LocationContext";
import { useAuth } from "../context/AuthContext";

type ModalState = "idle" | "loading" | "detected" | "manual" | "error";

interface District { id: number; name: string; }

async function reverseGeocode(lat: number, lng: number): Promise<{ district: string; state: string }> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) throw new Error("Geocoding failed");
  const data = await res.json();
  const addr = data.address ?? {};
  const district =
    addr.state_district ?? addr.county ?? addr.city ?? addr.town ?? addr.village ?? "Unknown";
  const clean = district.replace(/\s*district\s*$/i, "").trim();
  const state = addr.state ?? "";
  return { district: clean, state };
}

interface Props { onClose?: () => void; }

export default function LocationPermissionModal({ onClose }: Props) {
  const { setUserLocation, markAsked } = useUserLocation();
  const { token } = useAuth();

  const [modalState, setModalState]       = useState<ModalState>("idle");
  const [detectedLat, setDetectedLat]     = useState(0);
  const [detectedLng, setDetectedLng]     = useState(0);
  const [detectedDist, setDetectedDist]   = useState("");
  const [detectedState, setDetectedState] = useState("");
  const [errorMsg, setErrorMsg]           = useState("");
  const [districts, setDistricts]         = useState<District[]>([]);
  const [selectedDistId, setSelectedDistId] = useState<number | "">("");

  const handleAllow = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Your browser doesn't support location. Please choose manually.");
      setModalState("error");
      return;
    }
    setModalState("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { lat, lng } = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          const { district, state } = await reverseGeocode(lat, lng);
          setDetectedLat(lat);
          setDetectedLng(lng);
          setDetectedDist(district);
          setDetectedState(state);
          setModalState("detected");
        } catch {
          setErrorMsg("Could not determine your district. Please choose manually.");
          setModalState("error");
        }
      },
      (err) => {
        if (err.code === 1) {
          setErrorMsg("Location permission denied. Please choose your district manually.");
        } else {
          setErrorMsg("Unable to get your location. Please choose manually.");
        }
        setModalState("error");
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const handleConfirm = () => {
    setUserLocation({ lat: detectedLat, lng: detectedLng, districtName: detectedDist, stateName: detectedState, detected: true });
    onClose?.();
  };

  const handleOpenManual = async () => {
    setModalState("manual");
    if (districts.length > 0) return;
    try {
      const hdr = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch("/api/booths/districts", { headers: hdr });
      if (res.ok) {
        const data: District[] = await res.json();
        setDistricts(data);
      }
    } catch { /* silent */ }
  };

  const handleManualConfirm = () => {
    if (!selectedDistId) return;
    const dist = districts.find(d => d.id === Number(selectedDistId));
    if (!dist) return;
    setUserLocation({ lat: 0, lng: 0, districtName: dist.name, stateName: "", detected: false });
    onClose?.();
  };

  const handleSkip = () => { markAsked(); onClose?.(); };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end items-center">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={handleSkip}
      />

      {/* Sheet — max mobile width so it doesn't stretch on desktop */}
      <motion.div
        className="relative w-full max-w-sm bg-[#001a4d] rounded-t-[32px] px-6 pt-7 pb-10 shadow-2xl border-t border-white/10"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 22 }}
      >
        {/* Handle */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/20 rounded-full" />

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X size={14} className="text-white/70" />
        </button>

        <AnimatePresence mode="wait">

          {/* ── IDLE ── */}
          {modalState === "idle" && (
            <motion.div key="idle" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-5">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center shadow-2xl shadow-blue-900/50">
                    <MapPin size={36} className="text-white" />
                  </div>
                  <span className="absolute -top-1 -right-1 flex h-5 w-5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                    <span className="relative inline-flex h-5 w-5 rounded-full bg-emerald-400 items-center justify-center">
                      <Navigation size={10} className="text-white" />
                    </span>
                  </span>
                </div>
              </div>

              {/* Text */}
              <div className="text-center space-y-1.5">
                <h2 className="text-xl font-black text-white">Find Campaigns Near You</h2>
                <p className="text-sm text-blue-200 leading-relaxed">
                  Allow location access to see election booths, volunteers, and campaign events in your area — instantly.
                </p>
              </div>

              {/* Location pill example */}
              <div className="flex justify-center">
                <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-2">
                  <MapPin size={12} className="text-blue-300" />
                  <span className="text-xs text-blue-200 font-medium">e.g. Nagpur · Maharashtra</span>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={handleAllow}
                className="w-full h-13 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-base shadow-lg shadow-blue-900/40 hover:from-blue-600 hover:to-indigo-700 active:scale-[0.98] transition-all"
              >
                <Navigation size={16} />
                Allow Location Access
              </button>

              <button
                onClick={handleOpenManual}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-2xl bg-white/10 border border-white/15 text-white/80 font-semibold text-sm hover:bg-white/15 active:scale-[0.98] transition-all"
              >
                Choose district manually
              </button>

              <button onClick={handleSkip} className="w-full text-center text-xs text-blue-300/60 hover:text-blue-300 transition-colors py-1">
                Skip · Show all campaigns
              </button>
            </motion.div>
          )}

          {/* ── LOADING ── */}
          {modalState === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-10 flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center shadow-2xl">
                <Loader size={32} className="text-white animate-spin" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-bold text-white text-base">Detecting your location…</p>
                <p className="text-xs text-blue-300">This takes just a moment</p>
              </div>
            </motion.div>
          )}

          {/* ── DETECTED ── */}
          {modalState === "detected" && (
            <motion.div key="detected" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-5">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-2xl shadow-emerald-900/40">
                  <CheckCircle2 size={36} className="text-white" />
                </div>
              </div>

              <div className="text-center space-y-1">
                <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest">Location Detected</p>
                <h2 className="text-xl font-black text-white">{detectedDist}</h2>
                {detectedState && <p className="text-sm text-blue-300">{detectedState}</p>}
              </div>

              <div className="bg-white/8 border border-white/10 rounded-2xl px-4 py-3 text-center">
                <p className="text-xs text-blue-200">We'll show you election booths and campaigns in <span className="font-bold text-white">{detectedDist} district</span></p>
              </div>

              <button
                onClick={handleConfirm}
                className="w-full h-13 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-base shadow-lg active:scale-[0.98] transition-all"
              >
                <CheckCircle2 size={16} />
                Yes, this is my area
              </button>

              <button
                onClick={handleOpenManual}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-2xl bg-white/10 border border-white/15 text-white/80 font-semibold text-sm hover:bg-white/15 active:scale-[0.98] transition-all"
              >
                Not here? Choose a different district
              </button>
            </motion.div>
          )}

          {/* ── MANUAL DISTRICT PICKER ── */}
          {modalState === "manual" && (
            <motion.div key="manual" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-black text-white">Select Your District</h2>
                <p className="text-sm text-blue-200">Choose the district where you are campaigning</p>
              </div>

              <div className="relative">
                <select
                  value={selectedDistId}
                  onChange={e => setSelectedDistId(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full h-13 rounded-2xl bg-white/10 border border-white/20 text-white text-sm font-semibold px-4 pr-10 appearance-none outline-none focus:border-blue-400 transition-colors"
                >
                  <option value="" className="bg-[#001a4d]">— Select district —</option>
                  {districts.length === 0 ? (
                    <option disabled className="bg-[#001a4d]">Loading…</option>
                  ) : (
                    districts.map(d => (
                      <option key={d.id} value={d.id} className="bg-[#001a4d]">{d.name}</option>
                    ))
                  )}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
              </div>

              <button
                onClick={handleManualConfirm}
                disabled={!selectedDistId}
                className="w-full h-13 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-base shadow-lg active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <MapPin size={16} />
                Set as My District
              </button>

              <button
                onClick={() => setModalState("idle")}
                className="w-full text-center text-sm text-blue-300/70 hover:text-blue-300 transition-colors"
              >
                ← Back
              </button>
            </motion.div>
          )}

          {/* ── ERROR ── */}
          {modalState === "error" && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-2xl">
                  <AlertCircle size={36} className="text-white" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <h2 className="text-base font-black text-white">Location Unavailable</h2>
                <p className="text-sm text-blue-200">{errorMsg}</p>
              </div>
              <button
                onClick={handleOpenManual}
                className="w-full h-13 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-base active:scale-[0.98] transition-all"
              >
                Choose District Manually
              </button>
              <button onClick={handleSkip} className="w-full text-center text-xs text-blue-300/60 hover:text-blue-300 transition-colors py-1">
                Skip · Show all campaigns
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}
