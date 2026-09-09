import { ArrowLeft, Bell } from "lucide-react";
import { useLocation } from "wouter";
import { Brand } from "./Brand";

export function Top({
  back = false,
  title = "",
  onBack,
}: {
  back?: boolean;
  title?: string;
  onBack?: () => void;
}) {
  const [, nav] = useLocation();
  return (
    <header className="flex items-center justify-between px-[22px] pt-5">
      <div className="flex items-center gap-3">
        {back && (
          <button
            aria-label="Go back"
            onClick={onBack || (() => nav("/dashboard"))}
            className="grid h-10 w-10 place-items-center rounded-full bg-[#eee8db] text-[#17324d] transition-transform active:scale-95"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        {title ? (
          <div className="text-sm font-bold text-[#17324d]">{title}</div>
        ) : (
          <Brand compact />
        )}
      </div>
      <button
        aria-label="Notifications"
        className="grid h-10 w-10 place-items-center rounded-full bg-[#fffdf8] text-[#536574] shadow-[0_4px_12px_rgba(55,42,21,.06)] transition-transform active:scale-95 hover:shadow-[0_4px_16px_rgba(55,42,21,.1)]"
      >
        <Bell size={18} />
      </button>
    </header>
  );
}
