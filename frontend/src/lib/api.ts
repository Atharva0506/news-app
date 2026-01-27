import { toast } from "sonner";

export const API_URL = "http://localhost:8000/api/v1";

export class ApiError extends Error {
  constructor(public status: number, public message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        errorData.detail || "An unexpected error occurred"
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        // Try to refresh token
        const refreshToken = localStorage.getItem("refresh_token");
        if (refreshToken) {
          try {
            // Avoid infinite loop if refresh itself fails
            if (endpoint.includes("/refresh")) throw error;

            // Call refresh endpoint directly using fetch to avoid circular dependency or complex recursion if I used api.auth.refresh logic excessively
            // But actually I can use a simple fetch here.
            const refreshRes = await fetch(`${API_URL}/auth/refresh?refresh_token=${refreshToken}`, { method: "POST" });

            if (refreshRes.ok) {
              const data = await refreshRes.json();
              localStorage.setItem("token", data.access_token);
              if (data.refresh_token) localStorage.setItem("refresh_token", data.refresh_token);

              // Retry original request with new token
              const newHeaders = {
                ...headers,
                Authorization: `Bearer ${data.access_token}`
              };
              const retryResponse = await fetch(`${API_URL}${endpoint}`, { ...options, headers: newHeaders });
              if (!retryResponse.ok) {
                const errData = await retryResponse.json().catch(() => ({}));
                throw new ApiError(retryResponse.status, errData.detail || "Error after refresh");
              }
              return retryResponse.json();
            } else {
              // Refresh failed
              localStorage.removeItem("token");
              localStorage.removeItem("refresh_token");
            }
          } catch (refreshErr) {
            // Refresh process failed
            localStorage.removeItem("token");
            localStorage.removeItem("refresh_token");
            throw error;
          }
        } else {
          localStorage.removeItem("token");
        }
      }
      throw error;
    }
    throw new ApiError(500, (error as Error).message || "Network Error");
  }
}

export const api = {
  auth: {
    login: (data: any) =>
      fetch(`${API_URL}/auth/login`, {
        method: "POST",
        body: new URLSearchParams(data), // OAuthFormRequest expects form data
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      }).then(async res => {
        if (!res.ok) throw new ApiError(res.status, (await res.json()).detail);
        return res.json();
      }),
    signup: (data: any) => fetchWithAuth("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    me: () => fetchWithAuth("/auth/me"),
    usage: () => fetchWithAuth("/auth/me/usage"),
    refresh: (token: string) => fetchWithAuth(`/auth/refresh?refresh_token=${token}`, { method: "POST" }),
  },
  news: {
    getFeed: (filters?: { category?: string; sentiment?: string; search?: string }) => {
      const params = new URLSearchParams();
      if (filters?.category) params.append("category", filters.category);
      if (filters?.sentiment) params.append("sentiment", filters.sentiment);
      if (filters?.search) params.append("search", filters.search);

      return fetchWithAuth(`/news/feed?${params.toString()}`);
    },
    getArticle: (id: string) => fetchWithAuth(`/news/${id}`),
  },
  ai: {
    ask: (data: { question: string; article_id?: string; context?: string }) =>
      fetchWithAuth("/ai/ask", { method: "POST", body: JSON.stringify(data) }),
    summarizeFeed: () => fetchWithAuth("/ai/feed/summary", { method: "POST" }),
  },
  preferences: {
    get: () => fetchWithAuth("/preferences/me"),
    update: (data: any) => fetchWithAuth("/preferences/me", { method: "PUT", body: JSON.stringify(data) }),
  },
  payments: {
    createIntent: (amount: number) => fetchWithAuth("/payments/create", {
      method: "POST",
      body: JSON.stringify({ amount })
    }),
    verify: (data: any) => fetchWithAuth("/payments/verify", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    history: () => fetchWithAuth("/payments/history"), // Endpoint might need to be created in backend if not exists, user demanded it in plan.
  }
};
