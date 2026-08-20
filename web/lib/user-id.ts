const STORAGE_KEY = "smart_sorter_user_id";

export function getUserId(): string {
  if (typeof window === "undefined") {
    return "server";
  }

  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const id = `device-${crypto.randomUUID()}`;
  localStorage.setItem(STORAGE_KEY, id);
  return id;
}
