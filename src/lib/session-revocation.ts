/**
 * Sessão web (JWT) aberta antes de uma revogação (troca de senha, Google assumindo
 * a conta)? Sessões sem `authAt` (anteriores a esta regra) contam como antigas.
 */
export function sessionRevoked(authAt: number | undefined, validAfter: Date | null) {
  return Boolean(validAfter && (authAt ?? 0) < validAfter.getTime());
}
