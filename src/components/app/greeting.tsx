import { getCurrentUser } from "@/lib/dal";

const titleClass = "titulo-display text-4xl text-estadio";

export function GreetingFallback() {
  return <h1 className={titleClass}>Olá!</h1>;
}

export async function Greeting() {
  const user = await getCurrentUser();
  const firstName = user.name?.trim().split(/\s+/)[0];
  return <h1 className={titleClass}>Olá{firstName ? `, ${firstName}` : ""}!</h1>;
}
