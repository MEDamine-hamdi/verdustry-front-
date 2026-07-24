/**
 * FastAPI backend client — single place for all HTTP calls.
 * Base URL: NEXT_PUBLIC_API_URL (default http://localhost:8000/api/v1)
 */

import type { Role } from "@/lib/roles";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string; detail?: string | unknown };
    if (typeof data.error === "string") return data.error;
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail
        .map((item) => {
          if (typeof item === "object" && item && "msg" in item) {
            return String((item as { msg: string }).msg);
          }
          return JSON.stringify(item);
        })
        .join(", ");
    }
  } catch {
    /* ignore */
  }
  return res.statusText || `Request failed (${res.status})`;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/* ---------- Types ---------- */

export type ApiUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  companyId?: string;
  otpEnabled?: boolean;
  emailVerified?: boolean;
};

export type LoginResponse = {
  access_token?: string;
  otpRequired: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    companyId?: string;
    otpEnabled?: boolean;
    emailVerified?: boolean;
  };
};

export type ApiCompany = {
  id: string;
  name: string;
  taxId: string;
  sector?: string;
  country?: string;
  createdAt?: string;
};

export type CreateCompanyPayload = {
  name: string;
  taxId: string;
  sector?: string;
  country?: string;
};

export type UpdateCompanyPayload = {
  name?: string;
  taxId?: string;
  sector?: string;
  country?: string;
};

export type CreateUserPayload = {
  email: string;
  name: string;
  role: Role;
  password: string;
  isActive?: boolean;
  companyId?: string;
};

export type UpdateUserPayload = {
  email?: string;
  name?: string;
  role?: Role;
  password?: string;
  isActive?: boolean;
  companyId?: string;
};

/* ---------- Auth ---------- */

export async function loginWithApi(
  email: string,
  password: string,
  captchaToken: string,
  otpCode?: string,
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, captcha_token: captchaToken, otp_code: otpCode }),
  });
}

export async function fetchMe(token: string): Promise<ApiUser> {
  return apiFetch<ApiUser>("/auth/me", { token });
}

export async function forgotPasswordApi(email: string): Promise<{ ok: boolean; message: string }> {
  return apiFetch("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPasswordApi(
  token: string,
  new_password: string,
): Promise<{ ok: boolean; message: string }> {
  return apiFetch("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password }),
  });
}

export async function verifyEmailApi(token: string): Promise<{ ok: boolean; message: string }> {
  return apiFetch("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function resendVerificationApi(email: string): Promise<{ ok: boolean; message: string }> {
  return apiFetch("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function requestOtpApi(email: string): Promise<{ ok: boolean; message: string }> {
  return apiFetch("/auth/request-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function verifyOtpApi(
  email: string,
  code: string,
): Promise<{ ok: boolean; message: string }> {
  return apiFetch("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
}

export async function requestEnableOtpApi(token: string): Promise<{ ok: boolean; message: string }> {
  return apiFetch("/auth/otp/enable/request", {
    method: "POST",
    token,
  });
}

export async function confirmEnableOtpApi(
  token: string,
  code: string,
): Promise<{ ok: boolean; message: string }> {
  return apiFetch("/auth/otp/enable/confirm", {
    method: "POST",
    token,
    body: JSON.stringify({ code }),
  });
}

export async function disableOtpApi(token: string): Promise<{ ok: boolean; message: string }> {
  return apiFetch("/auth/otp/disable", {
    method: "POST",
    token,
  });
}

/* ---------- Companies (Admin) ---------- */

export async function fetchCompanies(token: string): Promise<ApiCompany[]> {
  return apiFetch<ApiCompany[]>("/companies", { token });
}

export async function createCompanyApi(
  token: string,
  payload: CreateCompanyPayload,
): Promise<ApiCompany> {
  return apiFetch<ApiCompany>("/companies", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function updateCompanyApi(
  token: string,
  id: string,
  payload: UpdateCompanyPayload,
): Promise<ApiCompany> {
  return apiFetch<ApiCompany>(`/companies/${id}`, {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}

export async function deleteCompanyApi(
  token: string,
  id: string,
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/companies/${id}`, {
    method: "DELETE",
    token,
  });
}

/* ---------- Users (Admin) ---------- */

export async function fetchUsers(token: string): Promise<ApiUser[]> {
  return apiFetch<ApiUser[]>("/users", { token });
}

export async function createUserApi(
  token: string,
  payload: CreateUserPayload,
): Promise<ApiUser> {
  return apiFetch<ApiUser>("/users", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function updateUserApi(
  token: string,
  id: string,
  payload: UpdateUserPayload,
): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/users/${id}`, {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}

export async function deleteUserApi(
  token: string,
  id: string,
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/users/${id}`, {
    method: "DELETE",
    token,
  });
}