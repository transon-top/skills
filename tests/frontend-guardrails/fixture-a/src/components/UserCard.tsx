// 违规样例：component 层直接 import service 层
// 期望 dependency-cruiser 的 ui-no-data-layer 报错
import { loadUser } from "@/services/user-api";

export function UserCard({ id }: { id: string }) {
  return (
    <button type="button" onClick={() => void loadUser(id)}>
      {id}
    </button>
  );
}
