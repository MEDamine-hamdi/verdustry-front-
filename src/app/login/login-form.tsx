"use client";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { loginWithApi, resendVerificationApi, ApiError } from "@/lib/api";
import Turnstile from "@/components/turnstile";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpRequired, setOtpRequired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);

  async function handleCredentialsSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNeedsVerification(false);
    setResendSent(false);

    if (!captchaToken) {
      setError("Veuillez valider le captcha.");
      setLoading(false);
      return;
    }

    try {
      const result = await loginWithApi(email, password, captchaToken);
      if (result.otpRequired) {
        setOtpRequired(true);
        setLoading(false);
        return;
      }
      if (!result.access_token) {
        setError("Une erreur est survenue. Réessayez.");
        setLoading(false);
        return;
      }
      await finalizeSignIn(result.access_token);
    } catch (err) {
      setLoading(false);
      setCaptchaToken("");
      setCaptchaKey((k) => k + 1);
      if (err instanceof ApiError && err.status === 403) {
        setNeedsVerification(true);
        setError("Votre adresse email n'est pas encore vérifiée. Consultez votre boîte mail.");
        return;
      }
      if (err instanceof ApiError && (err.status === 401 || err.status === 400)) {
        setError("Identifiants incorrects. Vérifiez votre email et votre mot de passe.");
        return;
      }
      setError("Une erreur est survenue. Réessayez.");
    }
  }

  async function handleResend() {
    try {
      await resendVerificationApi(email);
      setResendSent(true);
    } catch {
      setResendSent(true);
    }
  }

  async function handleOtpSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await loginWithApi(email, password, captchaToken, otpCode);
      if (!result.access_token) {
        setLoading(false);
        setError("Code invalide ou expiré.");
        return;
      }
      await finalizeSignIn(result.access_token);
    } catch {
      setLoading(false);
      setError("Code invalide ou expiré.");
    }
  }

  async function finalizeSignIn(accessToken: string) {
    const result = await signIn("credentials", {
      accessToken,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Une erreur est survenue. Réessayez.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      {/* ===== LEFT: BRAND PANEL ===== */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[var(--ink)] p-12 text-[#dfe8e2] md:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(31,109,70,0.35), transparent 40%), radial-gradient(circle at 85% 75%, rgba(201,122,42,0.18), transparent 45%)",
          }}
        />
        <div className="relative z-10 flex items-center gap-3">
          <svg viewBox="0 0 30 30" fill="none" className="h-9 w-9">
            <circle cx="15" cy="6" r="3" fill="#bfe8cf" />
            <circle cx="6" cy="22" r="3" fill="#6fa583" />
            <circle cx="24" cy="22" r="3" fill="#6fa583" />
            <path d="M15 9 L6 19 M15 9 L24 19 M6 22 L24 22" stroke="#3f6b53" strokeWidth="1.4" />
          </svg>
          <div>
            <div className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-white">
              Verdustry
            </div>
            <div className="text-[11px] uppercase tracking-[0.08em] text-[#9db8a9]">
              Copilote ESG
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center">
          <svg viewBox="0 0 380 260" fill="none" className="w-full max-w-[380px]">
            <g opacity="0.9">
              <circle cx="190" cy="30" r="5" fill="#bfe8cf" />
              <circle cx="70" cy="120" r="5" fill="#6fa583" />
              <circle cx="310" cy="120" r="5" fill="#6fa583" />
              <circle cx="30" cy="220" r="4" fill="#3f6b53" />
              <circle cx="140" cy="220" r="4" fill="#3f6b53" />
              <circle cx="250" cy="220" r="4" fill="#3f6b53" />
              <circle cx="350" cy="220" r="4" fill="#3f6b53" />
              <path
                d="M190 30 L70 120 M190 30 L310 120 M70 120 L30 220 M70 120 L140 220 M310 120 L250 220 M310 120 L350 220"
                stroke="#3f6b53"
                strokeWidth="1.2"
                strokeDasharray="3 4"
              />
            </g>
          </svg>
        </div>

        <div className="relative z-10 max-w-[420px]">
          <h2 className="text-[26px] font-medium leading-snug text-white">
            Vos données ESG déjà calculées.
            <br />
            Notre intelligence décisionnelle.
          </h2>
          <p className="mt-3.5 text-[13.5px] leading-relaxed text-[#a9c0b3]">
            Prédictions, détection d&apos;anomalies, recommandations chiffrées et simulation de
            scénarios — connectés à vos bilans carbone existants, pour une conformité CSRD / CBAM
            / SBTi pilotée par la donnée.
          </p>
        </div>
      </div>

      {/* ===== RIGHT: LOGIN FORM ===== */}
      <div className="flex items-center justify-center bg-[var(--paper)] p-10">
        <div className="w-full max-w-[380px]">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--moss)]">
            Accès plateforme
          </div>
          <h1 className="text-[26px]">{otpRequired ? "Vérification" : "Connexion"}</h1>
          <p className="mb-7 mt-1.5 text-[13.5px] text-[var(--text-soft)]">
            {otpRequired
              ? "Entrez le code à 6 chiffres envoyé à votre adresse email."
              : "Accédez à votre espace selon votre rôle : Direction, Responsable ESG, Administrateur ou Auditeur."}
          </p>

          {error && (
            <div className="mb-4.5 flex items-start gap-2.5 rounded-[9px] border border-[#eecdc2] bg-[#f8e6e1] px-3.5 py-2.5 text-[12.5px] text-[#8a3320]">
              <span>⚠️</span>
              <div>{error}</div>
            </div>
          )}

          {needsVerification && (
            <div className="mb-4.5">
              {resendSent ? (
                <div className="rounded-[9px] border border-[var(--line)] bg-white px-3.5 py-2.5 text-[12.5px] text-[var(--text-soft)]">
                  Un nouvel email de vérification a été envoyé.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-[12.5px] font-semibold text-[var(--moss-dark)] hover:underline"
                >
                  Renvoyer l&apos;email de vérification
                </button>
              )}
            </div>
          )}

          {!otpRequired ? (
            <form onSubmit={handleCredentialsSubmit}>
              <div className="mb-4">
                <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--text-soft)]">
                  Adresse email professionnelle
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prenom.nom@entreprise.tn"
                  className="input-field"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--text-soft)]">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="input-field pr-16"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11.5px] font-semibold text-[var(--text-faint)] hover:text-[var(--moss-dark)]"
                  >
                    {showPassword ? "Masquer" : "Afficher"}
                  </button>
                </div>
              </div>

              <div className="mb-5.5 flex items-center justify-between text-[12.5px]">
                <a href="/forgot-password" className="font-semibold text-[var(--moss-dark)] hover:underline">
                  Mot de passe oublié ?
                </a>
              </div>

              <Turnstile key={captchaKey} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken("")} />

              <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center py-3 text-sm disabled:opacity-60">
                {loading ? "Connexion…" : "Se connecter →"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit}>
              <div className="mb-5.5">
                <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--text-soft)]">
                  Code de vérification
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="input-field text-center tracking-[6px]"
                  maxLength={6}
                  autoComplete="one-time-code"
                  required
                />
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center py-3 text-sm disabled:opacity-60">
                {loading ? "Vérification…" : "Valider →"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setOtpRequired(false);
                  setOtpCode("");
                  setError("");
                }}
                className="mt-3 w-full text-center text-[12.5px] font-semibold text-[var(--text-faint)] hover:text-[var(--moss-dark)]"
              >
                ← Retour
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}