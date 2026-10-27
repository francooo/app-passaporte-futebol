import Link from "next/link";
import { KitIcon } from "@/components/ui/kit-icon";
import { getCurrentUser } from "@/lib/dal";

const ring = "grid size-11 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-estadio bg-partida";

export function UserAvatarFallback() {
  return (
    <span className={ring} aria-hidden>
      <KitIcon name="profile" size={24} />
    </span>
  );
}

/** Avatar da barra superior; leva ao Perfil. */
export async function UserAvatar() {
  const user = await getCurrentUser();
  return (
    <Link href="/app/perfil" className={ring} aria-label={`Perfil de ${user.name ?? "torcedor"}`}>
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatar externo do Google
        <img src={user.image} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <KitIcon name="profile" size={24} />
      )}
    </Link>
  );
}
