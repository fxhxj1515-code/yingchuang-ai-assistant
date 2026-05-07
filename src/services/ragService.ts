/** RAG API 服务层 */

const API = "http://127.0.0.1:5050/rag";

function genRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 带重试的 fetch，bridge 启动需 20s 解包 */
async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxRetries = 3,
  delayMs = 3000
): Promise<Response> {
  let lastError: Error | null = null;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const r = await fetch(url, options);
      return r;
    } catch (e: any) {
      lastError = e;
      if (i < maxRetries) {
        console.warn(`[RAG] fetch failed (attempt ${i + 1}/${maxRetries + 1}), retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 1.5; // 指数退避
      }
    }
  }
  throw lastError || new Error("网络请求失败");
}

// ── 知识库 CRUD ──

export async function getCollections(): Promise<
  import("../types/knowledgeBase").KBCollection[]
> {
  const r = await fetchWithRetry(`${API}/collections`);
  if (!r.ok) throw new Error("获取知识库列表失败");
  return r.json();
}

export async function createCollection(name: string, description?: string) {
  const r = await fetchWithRetry(`${API}/collections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
  if (!r.ok) throw new Error("创建知识库失败");
  return r.json();
}

export async function deleteCollection(id: string) {
  const r = await fetchWithRetry(`${API}/collections/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error("删除知识库失败");
}

export async function getDocuments(collectionId: string): Promise<
  import("../types/knowledgeBase").KBDocument[]
> {
  const r = await fetchWithRetry(`${API}/collections/${collectionId}/documents`);
  if (!r.ok) throw new Error("获取文档列表失败");
  return r.json();
}

export async function uploadDocument(collectionId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const r = await fetchWithRetry(`${API}/collections/${collectionId}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: "上传失败" }));
    throw new Error(err.error || "上传失败");
  }
  return r.json();
}

export async function deleteDocument(docId: string) {
  const r = await fetchWithRetry(`${API}/documents/${docId}`, { method: "DELETE" });
  if (!r.ok) throw new Error("删除文档失败");
}

// ── 检索 ──

export async function ragSearch(
  query: string,
  collectionId?: string,
  topK = 3
): Promise<import("../types/knowledgeBase").RAGSearchResponse> {
  const r = await fetchWithRetry(`${API}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": genRequestId(),
    },
    body: JSON.stringify({ query, collection_id: collectionId, top_k: topK }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: "检索失败" }));
    throw new Error(err.error || "检索失败");
  }
  return r.json();
}

export async function ragContext(
  query: string,
  collectionId?: string
): Promise<import("../types/knowledgeBase").RAGContextResponse> {
  const r = await fetchWithRetry(`${API}/context`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, collection_id: collectionId }),
  });
  if (!r.ok) return { context: "", results: [] };
  return r.json();
}

// ── 状态 ──

export async function ragStatus(): Promise<
  import("../types/knowledgeBase").RAGStatus
> {
  const r = await fetchWithRetry(`${API}/status`);
  if (!r.ok) throw new Error("获取 RAG 状态失败");
  return r.json();
}
