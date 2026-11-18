import { useState } from "react";
import Svg, { Path } from "react-native-svg";
import { Button } from "@/components/button";
import { FormMessage } from "@/components/form-bits";
import { ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { GoogleCancelled, googleAvailable } from "@/lib/google-signin";

function GoogleLogo() {
  return (
    <Svg viewBox="0 0 24 24" width={20} height={20}>
      <Path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z" />
      <Path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <Path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
      <Path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </Svg>
  );
}

/** "Entrar com Google" (Android/iOS). Some quando o build não tem o client ID ou no web. */
export function GoogleButton({ label = "Entrar com Google" }: { label?: string }) {
  const { signInWithGoogle } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!googleAvailable) return null;

  async function press() {
    setPending(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      if (e instanceof GoogleCancelled) return;
      setError(e instanceof ApiRequestError ? e.body.message : "Não foi possível entrar com Google. Tente de novo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="secundario" icon={<GoogleLogo />} loading={pending} onPress={press}>
        {label}
      </Button>
      <FormMessage message={error ? { text: error, ok: false } : null} />
    </>
  );
}
