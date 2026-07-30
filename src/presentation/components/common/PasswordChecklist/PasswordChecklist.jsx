/**
 * PasswordChecklist
 *
 * Live requirements list rendered under a "set password" input. Each
 * rule ticks green as the user types so they see progress instead of
 * hitting a validation wall on submit. The rule set here is the single
 * source of truth for the password policy shown to the user — the
 * enforcement lives in `registerSchema` / `changePasswordSchema` and
 * must stay in sync.
 */

'use client';

import { Check, Circle } from 'lucide-react';

export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (v) => (v || '').length >= 8 },
  { id: 'digit', label: 'Contains at least 1 number', test: (v) => /[0-9]/.test(v || '') },
];

// Handy predicate for callers that want a boolean without pulling
// the full rules list.
export function isPasswordValid(pw) {
  return PASSWORD_RULES.every((r) => r.test(pw));
}

export function PasswordChecklist({ password = '', className = '' }) {
  return (
    <ul className={`mt-1.5 space-y-1 text-[11px] ${className}`}>
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-1.5 transition-opacity ${
              ok ? 'text-emerald-400 opacity-100' : 'text-[#A0A0A0] opacity-60'
            }`}
          >
            {ok ? (
              <Check className="w-3 h-3" strokeWidth={3} />
            ) : (
              <Circle className="w-3 h-3" strokeWidth={2} />
            )}
            <span>{rule.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default PasswordChecklist;
