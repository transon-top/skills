import { Button } from "@/components/Button";
import { useUserName } from "@/hooks/use-user-name";
import { formatPrice } from "@/lib/format-price";
import { formatPrice as formatPriceAlt } from "@/utils/price-formatter";

export function App() {
  const name = useUserName();

  return (
    <div>
      <h1>{name}</h1>
      {/* 违规：img 缺 alt */}
      <img src="/logo.png" />
      {/* 违规：div 绑定 onClick，无键盘可达性 */}
      <div onClick={() => formatPrice(1999)}>价格</div>
      <p>{formatPrice(2999)}</p>
      <p>{formatPriceAlt(3999)}</p>
      <Button label="Buy" />
    </div>
  );
}
