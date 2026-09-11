// 违规样例：service 层 import 了 component 层
// 期望 boundaries/dependencies 报错
import { Button } from "@/components/Button";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const API_BASE = "https://api.example.com";

export async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`${API_BASE}/users/${id}`);
  if (!res.ok) {
    // 违规样例：sonarjs 重复字符串字面量 / 相同分支
    throw new Error("request failed");
  }
  return (await res.json()) as User;
}

export function renderUserLabel(user: User): string {
  return `${user.firstName} ${user.lastName} <${user.email}>`;
}

export function buttonFor(user: User) {
  return Button({ label: renderUserLabel(user) });
}
