import { Suspense, type ReactNode } from "react";
import { UserAvatar, UserAvatarFallback } from "@/components/app/user-avatar";
import { BottomNav } from "@/components/ui/bottom-nav";
import { KitIcon } from "@/components/ui/kit-icon";
import { Logo } from "@/components/ui/logo";
import { TopNav } from "@/components/ui/top-nav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Mobile e tablet */}
      <header className="mx-auto flex w-full max-w-xl items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] md:max-w-3xl lg:hidden">
        <Logo />
        <button type="button" aria-label="Abrir menu" className="grid size-12 place-items-center rounded-xl">
          <KitIcon name="menu" size={30} />
        </button>
      </header>

      {/* Desktop */}
      <TopNav
        account={
          <Suspense fallback={<UserAvatarFallback />}>
            <UserAvatar />
          </Suspense>
        }
      />

      <main className="mx-auto w-full max-w-xl flex-1 px-5 pb-28 pt-4 md:max-w-3xl lg:max-w-7xl lg:px-8 lg:pb-16 lg:pt-10">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
