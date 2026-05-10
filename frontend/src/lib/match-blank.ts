/**
 * Fill-in match policy. Used by FillInCard to grade each blank.
 *
 * Order: exact case-sensitive trimmed → case-insensitive trimmed →
 * wrong. No fuzzy matching, no Levenshtein. Python interview answers
 * are precise; "List" should not match "list" in any pre-grading
 * sense, but trimmed/case-insensitive forgiveness is appropriate
 * for typo-class mistakes the user obviously meant to spell right.
 *
 * Lives outside FillInCard.tsx so the policy is testable in isolation
 * and the component file stays a "components-only export" per the
 * react-refresh ESLint rule.
 */
export function matchBlank(input: string, accepted: readonly string[]): boolean {
  const t = input.trim()
  if (accepted.some((a) => a.trim() === t)) return true
  const lower = t.toLowerCase()
  return accepted.some((a) => a.trim().toLowerCase() === lower)
}
