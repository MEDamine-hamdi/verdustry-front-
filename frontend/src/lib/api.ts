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

/* ---------- Sites / Suppliers / Targets (Admin) ---------- */

export type ApiSite = {
  id: string;
  name: string;
  country?: string;
  city?: string;
  siteType?: string;
  companyId: string;
};

export type ApiSupplier = {
  id: string;
  name: string;
  country?: string;
  sector?: string;
  companyId: string;
};

export type ApiTarget = {
  id: string;
  name: string;
  metric: string;
  baselineValue?: number;
  baselineYear?: number;
  targetValue?: number;
  targetYear?: number;
  deadline?: string;
  companyId: string;
};

export async function fetchSites(token: string, companyId: string): Promise<ApiSite[]> {
  return apiFetch<ApiSite[]>(`/sites?company_id=${companyId}`, { token });
}

export async function createSiteApi(
  token: string,
  payload: { name: string; country?: string; city?: string; siteType?: string; companyId: string },
): Promise<ApiSite> {
  return apiFetch<ApiSite>("/sites", { method: "POST", token, body: JSON.stringify(payload) });
}

export async function updateSiteApi(
  token: string,
  id: string,
  payload: Partial<{ name: string; country: string; city: string; siteType: string }>,
): Promise<ApiSite> {
  return apiFetch<ApiSite>(`/sites/${id}`, { method: "PUT", token, body: JSON.stringify(payload) });
}

export async function deleteSiteApi(token: string, id: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/sites/${id}`, { method: "DELETE", token });
}

export async function fetchSuppliers(token: string, companyId: string): Promise<ApiSupplier[]> {
  return apiFetch<ApiSupplier[]>(`/suppliers?company_id=${companyId}`, { token });
}

export async function createSupplierApi(
  token: string,
  payload: { name: string; country?: string; sector?: string; companyId: string },
): Promise<ApiSupplier> {
  return apiFetch<ApiSupplier>("/suppliers", { method: "POST", token, body: JSON.stringify(payload) });
}

export async function updateSupplierApi(
  token: string,
  id: string,
  payload: Partial<{ name: string; country: string; sector: string }>,
): Promise<ApiSupplier> {
  return apiFetch<ApiSupplier>(`/suppliers/${id}`, { method: "PUT", token, body: JSON.stringify(payload) });
}

export async function deleteSupplierApi(token: string, id: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/suppliers/${id}`, { method: "DELETE", token });
}

export async function fetchTargets(token: string, companyId: string): Promise<ApiTarget[]> {
  return apiFetch<ApiTarget[]>(`/targets?company_id=${companyId}`, { token });
}

export async function createTargetApi(
  token: string,
  payload: {
    name: string;
    metric: string;
    baselineValue?: number;
    baselineYear?: number;
    targetValue?: number;
    targetYear?: number;
    deadline?: string;
    companyId: string;
  },
): Promise<ApiTarget> {
  return apiFetch<ApiTarget>("/targets", { method: "POST", token, body: JSON.stringify(payload) });
}

export async function updateTargetApi(
  token: string,
  id: string,
  payload: Partial<{
    name: string;
    metric: string;
    baselineValue: number;
    baselineYear: number;
    targetValue: number;
    targetYear: number;
    deadline: string;
  }>,
): Promise<ApiTarget> {
  return apiFetch<ApiTarget>(`/targets/${id}`, { method: "PUT", token, body: JSON.stringify(payload) });
}

export async function deleteTargetApi(token: string, id: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/targets/${id}`, { method: "DELETE", token });
}

/* ---------- Imports ---------- */

export type ImportLog = {
  id: string;
  dataSourceId: string;
  companyId: string;
  importedById?: string;
  status: "pending" | "success" | "failed" | "partial";
  rowsTotal?: number;
  rowsImported?: number;
  rowsFailed?: number;
  errorMessage?: string;
  importedAt?: string;
};

export async function importEmissionsExcel(
  token: string,
  companyId: string,
  file: File,
): Promise<ImportLog> {
  const formData = new FormData();
  formData.append("company_id", companyId);
  formData.append("file", file);

  const res = await fetch(`${API_URL}/imports/emissions/excel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }
  return (await res.json()) as ImportLog;
}
/* ---------- Analytics ---------- */

export type AggregateItem = {
  key: string;
  totalValue: number;
  unit: string;
};

export type AggregateResponse = {
  groupBy: string;
  items: AggregateItem[];
  totalValue: number;
};

export type TrendPoint = {
  period: string;
  value: number;
};

export type TrendResponse = {
  points: TrendPoint[];
  changePercent?: number;
};

export type TopEmitterItem = {
  category: string;
  totalValue: number;
  percentOfTotal: number;
};

export type TopEmittersResponse = {
  items: TopEmitterItem[];
};

export async function fetchAggregate(
  token: string,
  companyId: string,
  groupBy: string,
): Promise<AggregateResponse> {
  return apiFetch<AggregateResponse>(
    `/analytics/aggregate?company_id=${companyId}&group_by=${groupBy}`,
    { token },
  );
}

export async function fetchTrend(token: string, companyId: string): Promise<TrendResponse> {
  return apiFetch<TrendResponse>(`/analytics/trend?company_id=${companyId}`, { token });
}

export async function fetchTopEmitters(
  token: string,
  companyId: string,
): Promise<TopEmittersResponse> {
  return apiFetch<TopEmittersResponse>(`/analytics/top-emitters?company_id=${companyId}&limit=5`, {
    token,
  });
}

/* ---------- Benchmark ---------- */

export type BenchmarkGapItem = {
  referenceType: "sector_average" | "net_zero" | "sbti" | "csrd" | "cbam";
  label?: string;
  referenceValue: number;
  companyValue: number;
  gapValue: number;
  gapPercent: number;
  year?: number;
  unit: string;
};

export type BenchmarkResponse = {
  sector: string;
  companyTotalEmissions: number;
  items: BenchmarkGapItem[];
};

export async function fetchBenchmark(token: string, companyId: string): Promise<BenchmarkResponse> {
  return apiFetch<BenchmarkResponse>(`/benchmark?company_id=${companyId}`, { token });
}

/* ---------- Predictions (ML - experimental, local only) ---------- */

export type OvershootPredictionRequest = {
  sector: string;
  emissionsTco2e: number;
  productionVolume: number;
  emissionsMa3: number;
  emissionsTrend3m: number;
  targetTrend3m: number;
  gapToTargetPct: number;
  cbamExposureRatio: number;
  euExportShare: number;
};

export type OvershootPredictionResponse = {
  overshootRisk: boolean;
  probability: number;
};

export type CostPredictionRequest = {
  sector: string;
  emissionsTco2e: number;
  productionVolume: number;
  cbamExposureRatio: number;
  euExportShare: number;
  cbamPriceEurTco2e: number;
  freeAllocationPct: number;
};

export type CostPredictionResponse = {
  predictedCostTnd: number;
};

export async function predictOvershootRisk(
  token: string,
  data: OvershootPredictionRequest,
): Promise<OvershootPredictionResponse> {
  return apiFetch<OvershootPredictionResponse>("/predictions/overshoot-risk", {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}

export async function predictCbamCost(
  token: string,
  data: CostPredictionRequest,
): Promise<CostPredictionResponse> {
  return apiFetch<CostPredictionResponse>("/predictions/cbam-cost", {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}

/* ---------- XAI / Explanations (local only) ---------- */

export type ShapFactor = {
  factor: string;
  value: number;
  impact: number;
  direction: "increases" | "decreases";
};

export type OvershootExplanationResponse = {
  prediction: OvershootPredictionResponse;
  factors: ShapFactor[];
};

export async function explainOvershootRisk(
  token: string,
  data: OvershootPredictionRequest,
): Promise<OvershootExplanationResponse> {
  return apiFetch<OvershootExplanationResponse>("/predictions/overshoot-risk/explain", {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}

/* ---------- Google Auth ---------- */

export async function loginWithGoogleApi(idToken: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
}