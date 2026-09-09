import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Banknote, WifiOff } from "lucide-react";
import { PageTransition } from "../motion/pageTransitions";
import { slideUp } from "../motion/variants";

// SVG Network Visualization — shows disconnected state
function NetworkViz() {
  return (
    <svg
      width="200"
      height="60"
      viewBox="0 0 200 60"
      fill="none"
      className="mx-auto mt-6"
      aria-hidden="true"
    >
      {/* Left node */}
      <motion.circle
        cx="30"
        cy="30"
        r="8"
        fill="#5b936d"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      />
      {/* Left connection */}
      <motion.line
        x1="42"
        y1="30"
        x2="80"
        y2="30"
        stroke="#5b936d"
        strokeWidth="2"
        strokeDasharray="4 4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      />
      {/* Center — broken */}
      <motion.g
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.8, type: "spring" }}
      >
        <circle cx="100" cy="30" r="12" fill="#f3dfd8" />
        <text
          x="100"
          y="35"
          textAnchor="middle"
          fill="#b65c4a"
          fontSize="14"
          fontWeight="bold"
        >
          ×
        </text>
      </motion.g>
      {/* Right connection */}
      <motion.line
        x1="120"
        y1="30"
        x2="158"
        y2="30"
        stroke="#e4dccd"
        strokeWidth="2"
        strokeDasharray="4 4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 1.0, duration: 0.6 }}
      />
      {/* Right node */}
      <motion.circle
        cx="170"
        cy="30"
        r="8"
        fill="#e4dccd"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.4, 0.2, 0.4] }}
        transition={{ delay: 1.2, duration: 2, repeat: Infinity }}
      />
      {/* Labels */}
      <text
        x="30"
        y="52"
        textAnchor="middle"
        fill="#8b7c68"
        fontSize="8"
        fontWeight="600"
      >
        You
      </text>
      <text
        x="170"
        y="52"
        textAnchor="middle"
        fill="#8b7c68"
        fontSize="8"
        fontWeight="600"
      >
        Server
      </text>
    </svg>
  );
}

export default function Offline() {
  const [, nav] = useLocation();

  return (
    <PageTransition className="paper-grain flex flex-1 flex-col items-center justify-center px-7 text-center h-full bg-[#f8f4eb]">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="grid h-20 w-20 place-items-center rounded-[26px] bg-[#f3dfd8] text-[#b65c4a] shadow-sm"
      >
        <WifiOff size={38} />
      </motion.div>

      <motion.h1
        variants={slideUp}
        initial="initial"
        animate="animate"
        className="mt-7 text-3xl font-extrabold text-[#17324d]"
      >
        Internet nahi hai.
      </motion.h1>
      <motion.p
        variants={slideUp}
        initial="initial"
        animate="animate"
        className="mt-3 max-w-[310px] leading-7 text-[#66717b]"
      >
        Your saved information is safe. We'll finish syncing when you're
        connected again.
      </motion.p>

      {/* Network Visualization */}
      <NetworkViz />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-8 w-full space-y-3"
      >
        <div className="rounded-2xl bg-[#fffdf8] p-4 text-left border border-[#e4dccd] shadow-sm">
          <div className="flex items-center gap-3">
            <Banknote className="text-[#b37b12]" />
            <div>
              <div className="font-bold text-[#17324d]">Payment pending</div>
              <div className="text-sm text-[#8b7c68]">
                Nothing has been sent yet. Your money is safe.
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[#e9f0ea] border border-[#c5d9c9] p-3 text-sm font-semibold text-[#356449]">
          We will automatically retry when your connection returns.
        </div>
      </motion.div>

      <button
        className="primary-button mt-6 w-full"
        onClick={() => nav("/dashboard")}
      >
        Go to safe home
      </button>
    </PageTransition>
  );
}
