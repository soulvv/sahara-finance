import { env } from "../../config/env";

export interface OmnidimApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    statusCode?: number;
  };
}

export class OmnidimClient {
  private timeoutMs: number = 30000;

  get baseUrl(): string {
    return (
      env.OMNIDIM_BASE_URL || "https://backend.omnidim.io/api/v1"
    ).replace(/\/$/, "");
  }

  get apiKey(): string {
    return env.OMNIDIM_API_KEY || "";
  }

  /**
   * Checks if OmniDimension is configured with a valid API key.
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Safe authenticated request to OmniDimension REST API.
   */
  async request<T = any>(
    endpoint: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
      body?: any;
      headers?: Record<string, string>;
    } = {}
  ): Promise<OmnidimApiResponse<T>> {
    if (!this.isConfigured() && env.OMNIDIM_MODE === "real") {
      return {
        success: false,
        error: {
          code: "OMNIDIM_NOT_CONFIGURED",
          message: "OmniDimension API key is not configured.",
          statusCode: 503,
        },
      };
    }

    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      ...(options.headers || {}),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type");
      let responseData: any = null;
      if (contentType && contentType.includes("application/json")) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: responseData?.code || "OMNIDIM_API_ERROR",
            message:
              responseData?.message ||
              response.statusText ||
              "OmniDimension API returned an error.",
            statusCode: response.status,
          },
        };
      }

      return {
        success: true,
        data: responseData,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === "AbortError";
      return {
        success: false,
        error: {
          code: isTimeout ? "OMNIDIM_TIMEOUT" : "OMNIDIM_NETWORK_ERROR",
          message: isTimeout
            ? "OmniDimension connection timed out."
            : err.message || "Failed to communicate with OmniDimension service.",
          statusCode: isTimeout ? 504 : 502,
        },
      };
    }
  }
}

export const omnidimClient = new OmnidimClient();
