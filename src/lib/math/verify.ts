import { evaluate } from "mathjs";

export type MathClaim = {
  expression: string;
  claimed: number;
};

export type MathCheck = MathClaim & {
  actual: number | null;
  ok: boolean;
  reason?: string;
};

/** Verifikasi hitungan dengan kode (mathjs), bukan oleh LLM. */
export function verifyClaim({ expression, claimed }: MathClaim): MathCheck {
  try {
    const actual = Number(evaluate(expression));
    if (!Number.isFinite(actual)) {
      return { expression, claimed, actual: null, ok: false, reason: "Hasil bukan angka" };
    }
    const ok = Math.abs(actual - claimed) < 1e-9;
    return {
      expression,
      claimed,
      actual,
      ok,
      reason: ok ? undefined : `Seharusnya ${actual}, tertulis ${claimed}`,
    };
  } catch {
    return { expression, claimed, actual: null, ok: false, reason: "Ekspresi tidak valid" };
  }
}

export function verifyClaims(claims: MathClaim[]): MathCheck[] {
  return claims.map(verifyClaim);
}
