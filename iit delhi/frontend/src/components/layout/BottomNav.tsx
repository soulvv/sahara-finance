import { Home as HomeIcon, UserRound, WalletCards } from "lucide-react";
import { useLocation } from "wouter";
import { useLang } from "../../hooks/useLang";

export function BottomNav({ active = "home" }: { active?: string }) {
  const [, nav] = useLocation();
  const { lang, t } = useLang();

  const items = [
    { id: "home", label: t.home || "Home", icon: HomeIcon, path: "/dashboard" },
    {
      id: "activity",
      label: t.activity || "Activity",
      icon: WalletCards,
      path: "/dashboard?tab=activity",
    },
    { id: "profile", label: t.profile || "Profile", icon: UserRound, path: "/profile" },
  ];

  return (
    <nav className="safe-bottom fixed bottom-0 left-1/2 z-20 flex w-full max-w-[560px] -translate-x-1/2 justify-around border-t border-[#e4dccd] bg-[#fffdf8]/95 px-4 pt-3 backdrop-blur shadow-sm">
      <div className="flex w-full justify-around">
        {items.map(({ id, label, icon: Icon, path }) => (
          <button
            key={id}
            onClick={() => nav(path)}
            className={`flex min-h-[52px] min-w-[82px] flex-col items-center gap-1 text-[11px] font-bold transition-colors ${
              active === id
                ? "text-[#17324d]"
                : "text-[#9a9184] hover:text-[#536574]"
            }`}
          >
            <Icon size={20} strokeWidth={active === id ? 2.6 : 1.8} />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
export default BottomNav;
