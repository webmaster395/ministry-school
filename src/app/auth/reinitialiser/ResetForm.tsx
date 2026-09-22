"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { resetPassword, type ResetState } from "./actions";

export default function ResetForm({ tokenHash, initialError }: { tokenHash: string | null; initialError: string | null }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPassword, { error: initialError });
  const [show, setShow] = useState(false);

  return (
    <>
      {state.error && (
        <p className="login-error" role="alert">
          {state.error}
        </p>
      )}

      <form className="login-form" action={action}>
        {tokenHash && <input type="hidden" name="token_hash" value={tokenHash} />}

        <label>
          <span>Nouveau mot de passe</span>
          <span className="login-password">
            <input
              type={show ? "text" : "password"}
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="8 caractères minimum"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Masquer les mots de passe" : "Afficher les mots de passe"}
            >
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
        </label>

        <label>
          <span>Confirmer le mot de passe</span>
          <input
            type={show ? "text" : "password"}
            name="confirm"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="••••••••"
          />
        </label>

        <button className="login-submit" type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer et me connecter"} <span aria-hidden="true">→</span>
        </button>
      </form>
    </>
  );
}
