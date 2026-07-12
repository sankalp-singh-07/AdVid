import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/register")
    ) {
      originalRequest._retry = true;
      try {
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const { access_token } = response.data;
        localStorage.setItem("access_token", access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("access_token");
        window.dispatchEvent(new Event("auth_logout"));
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Normalize chat API payloads (answer/response, sources/citations).
 */
export function normalizeChatResponse(data = {}) {
  const answer = data.answer ?? data.response ?? "";
  const citations = (data.citations || data.sources || []).map(normalizeCitation);
  return {
    ...data,
    answer,
    response: answer,
    citations,
    conversation_id: data.conversation_id,
    message_id: data.message_id || data.id,
    knowledge_base_id: data.knowledge_base_id ?? null,
  };
}

export function normalizeCitation(c = {}) {
  const score = typeof c.score === "number" ? c.score : null;
  const confidence =
    typeof c.confidence === "number"
      ? c.confidence
      : score != null
        ? Math.round(Math.min(99, Math.max(1, score * 100)))
        : null;
  return {
    ...c,
    filename: c.filename || c.title || "Document",
    title: c.title || c.filename || "Document",
    page: c.page ?? 0,
    score: score ?? (confidence != null ? confidence / 100 : 0),
    confidence: confidence ?? 0,
    content: c.content || c.excerpt || "",
    excerpt: c.excerpt || (c.content || "").slice(0, 280),
    document_id: c.document_id || null,
  };
}

export function normalizeMessage(m = {}) {
  const citations = (m.citations || m.sources || []).map(normalizeCitation);
  return {
    id: m.id,
    role: m.role,
    content: m.content || "",
    citations,
    sources: citations,
    created_at: m.created_at,
  };
}

/**
 * Stream SSE chat from /chat/stream.
 * onEvent receives parsed JSON payloads.
 */
export async function streamChat(payload, { onEvent, signal } = {}) {
  const token = localStorage.getItem("access_token");
  const res = await fetch(`${API_BASE_URL}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    let detail = `Stream failed (${res.status})`;
    try {
      const errBody = await res.json();
      detail = errBody.message || errBody.detail || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";
    for (const part of parts) {
      const line = part
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.replace(/^data:\s?/, ""))
        .join("\n");
      if (!line) continue;
      try {
        const event = JSON.parse(line);
        onEvent?.(event);
      } catch {
        /* skip malformed chunks */
      }
    }
  }
}

export async function exportConversation(conversationId, format = "markdown") {
  const response = await api.post(
    `/chat/export/${conversationId}`,
    { format },
    { responseType: "blob" }
  );
  const ext = format === "pdf" ? "pdf" : format === "txt" ? "txt" : "md";
  const blob = new Blob([response.data]);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `conversation-${conversationId.slice(0, 8)}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default api;
export { API_BASE_URL };
