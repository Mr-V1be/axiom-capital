import { useEffect, useRef, useState } from "react";

export function useLimitPrice(
  symbol: string,
  marketPrice: string | null,
) {
  const [price, setPrice] = useState("");
  const edited = useRef(false);
  const activeSymbol = useRef(symbol);

  useEffect(() => {
    if (activeSymbol.current !== symbol) {
      activeSymbol.current = symbol;
      edited.current = false;
    }
    if (!edited.current && marketPrice) setPrice(marketPrice);
  }, [marketPrice, symbol]);

  const setUserPrice = (value: string) => {
    edited.current = true;
    setPrice(value);
  };

  return { price, setUserPrice };
}
