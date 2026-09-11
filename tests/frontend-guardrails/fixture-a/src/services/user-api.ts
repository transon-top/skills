// 契约消费方：类型来自生成的 client，响应在运行期用生成的 zod schema 校验。
import { getUserById } from "@/client";
import { zUser } from "@/client/zod.gen";

export async function loadUser(id: string) {
  const { data } = await getUserById({ path: { id } });

  const parsed = zUser.safeParse(data);
  if (!parsed.success) {
    throw new Error(`响应校验失败: ${parsed.error.message}`);
  }

  return parsed.data;
}
