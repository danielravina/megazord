"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Bitcoin } from "lucide-react";

interface CoinData {
  name: string;
  symbol: string;
  price: number;
  change24h: number;
}

async function fetchCrypto(): Promise<CoinData[]> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ripple,solana&vs_currencies=usd&include_24hr_change=true"
    );
    if (!res.ok) throw new Error("Failed");
    const json = await res.json();

    const coins: CoinData[] = [];
    if (json.ripple) {
      coins.push({ name: "XRP", symbol: "XRP", price: json.ripple.usd, change24h: json.ripple.usd_24h_change || 0 });
    }
    if (json.solana) {
      coins.push({ name: "Solana", symbol: "SOL", price: json.solana.usd, change24h: json.solana.usd_24h_change || 0 });
    }
    return coins;
  } catch {
    return [];
  }
}

export function CryptoWidget() {
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCrypto()
      .then(setCoins)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || coins.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 flex items-center gap-3 h-16 shrink-0">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Bitcoin size={14} />
        קריפטו
      </div>
      {coins.map((coin) => (
        <div key={coin.symbol} className="flex items-center gap-1.5 text-xs">
          <span className="font-semibold text-slate-700">{coin.symbol}</span>
          <span className="tabular-nums">${coin.price < 1 ? coin.price.toFixed(4) : coin.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          <span className={`flex items-center gap-0.5 tabular-nums ${coin.change24h >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {coin.change24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {coin.change24h > 0 ? "+" : ""}{Math.round(coin.change24h * 100) / 100}%
          </span>
        </div>
      ))}
    </div>
  );
}
