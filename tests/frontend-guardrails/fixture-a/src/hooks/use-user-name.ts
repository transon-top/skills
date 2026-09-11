import { useEffect, useState } from "react";
import { fetchUser } from "@/services/user-service";

export function useUserName() {
  const [name, setName] = useState("");
  const [user, setUser] = useState<{ firstName: string; lastName: string } | null>(null);

  useEffect(() => {
    fetchUser("1").then((u) => setUser({ firstName: u.firstName, lastName: u.lastName }));
  }, []);

  // 违规样例：派生值放进 useEffect + state，应直接在渲染期计算
  // 期望 react-you-might-not-need-an-effect 报错
  useEffect(() => {
    if (user) {
      setName(`${user.firstName} ${user.lastName}`);
    }
  }, [user]);

  return name;
}
