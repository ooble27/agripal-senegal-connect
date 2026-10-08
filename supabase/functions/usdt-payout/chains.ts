// Envoi d'USDT depuis le portefeuille chaud d'Ooble.
//
// Deux familles de réseaux :
//   • Tron (TRC20) — API HTTP TronGrid, transaction signée ici avec la clé
//     PAYOUT_TRON_KEY (secp256k1, la même courbe qu'Ethereum) ;
//   • EVM (BEP20, Polygon, Avalanche, ERC20) — ethers, clé PAYOUT_EVM_KEY.
// Solana n'est pas encore pris en charge : ces ordres restent manuels.
//
// Chaque envoi se fait en deux temps : `prepare` construit et signe la
// transaction et renvoie son hash AVANT diffusion (on l'enregistre en base),
// puis `broadcast` la diffuse. Si la diffusion échoue de façon ambiguë, le
// hash permet de vérifier plus tard sur la blockchain ce qui s'est passé.

import {
  Contract, JsonRpcProvider, SigningKey, Wallet,
  computeAddress, concat, decodeBase58, encodeBase58, formatUnits,
  getBytes, hexlify, keccak256, parseUnits, sha256, toBeHex, zeroPadValue,
} from "npm:ethers@6.13.4";

export type Net = "trc20" | "bep20" | "polygon" | "avalanche" | "erc20" | "spl";

type EvmNet = Exclude<Net, "trc20" | "spl">;

const EVM: Record<EvmNet, { chainId: number; rpc: string; env: string; usdt: string; gas: string; explorer: string; minGas: number }> = {
  bep20:     { chainId: 56,    rpc: "https://bsc-dataseed.binance.org",          env: "RPC_BEP20",     usdt: "0x55d398326f99059fF775485246999027B3197955", gas: "BNB",  explorer: "https://bscscan.com/tx/",         minGas: 0.0005 },
  polygon:   { chainId: 137,   rpc: "https://polygon-bor-rpc.publicnode.com",    env: "RPC_POLYGON",   usdt: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", gas: "POL",  explorer: "https://polygonscan.com/tx/",     minGas: 0.5 },
  avalanche: { chainId: 43114, rpc: "https://api.avax.network/ext/bc/C/rpc",     env: "RPC_AVALANCHE", usdt: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", gas: "AVAX", explorer: "https://snowtrace.io/tx/",        minGas: 0.02 },
  erc20:     { chainId: 1,     rpc: "https://ethereum-rpc.publicnode.com",       env: "RPC_ERC20",     usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7", gas: "ETH",  explorer: "https://etherscan.io/tx/",        minGas: 0.003 },
};

const TRON = {
  api: "https://api.trongrid.io",
  usdt: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  explorer: "https://tronscan.org/#/transaction/",
  // Plafond de TRX brûlés pour un transfert (en sun). Un transfert USDT
  // coûte de l'énergie ; sans énergie gelée, elle est payée en TRX.
  feeLimit: 40_000_000,
  minTrx: 20,
};

export const SUPPORTED: Net[] = ["trc20", "bep20", "polygon", "avalanche", "erc20"];

export const explorerUrl = (net: Net, hash: string) =>
  net === "trc20" ? TRON.explorer + hash : net in EVM ? EVM[net as EvmNet].explorer + hash : "";

const ERC20_ABI = [
  "function transfer(address to, uint256 value)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

/** Erreur dont on sait qu'aucune transaction n'est partie. */
export class SafeError extends Error {}

function keyFor(net: Net, override?: string): string {
  if (override) return override;
  const k = (Deno.env.get(net === "trc20" ? "PAYOUT_TRON_KEY" : "PAYOUT_EVM_KEY") ?? "").trim();
  if (!k) throw new SafeError(net === "trc20" ? "Clé PAYOUT_TRON_KEY absente." : "Clé PAYOUT_EVM_KEY absente.");
  return k.startsWith("0x") ? k : `0x${k}`;
}

export function hasKey(net: Net): boolean {
  try { keyFor(net); return true; } catch { return false; }
}

// ───────────────────────── Tron ─────────────────────────

const dsha = (b: Uint8Array) => getBytes(sha256(sha256(b)));

function tronFromKey(key: string): string {
  const evm = computeAddress(key);
  const raw = getBytes("0x41" + evm.slice(2));
  return encodeBase58(concat([raw, dsha(raw).slice(0, 4)]));
}

/** Adresse Tron (base58) → 21 octets (préfixe 0x41), checksum vérifié. */
function tronToBytes(addr: string): Uint8Array {
  let b: Uint8Array;
  try { b = getBytes(toBeHex(decodeBase58(addr), 25)); } catch { throw new SafeError("Adresse Tron invalide."); }
  const payload = b.slice(0, 21), chk = b.slice(21);
  if (payload[0] !== 0x41 || hexlify(dsha(payload).slice(0, 4)) !== hexlify(chk)) throw new SafeError("Adresse Tron invalide.");
  return payload;
}

async function tron(path: string, body: unknown) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const k = Deno.env.get("TRONGRID_API_KEY");
  if (k) headers["TRON-PRO-API-KEY"] = k;
  const res = await fetch(TRON.api + path, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`TronGrid ${path} → HTTP ${res.status}`);
  return await res.json();
}

const hexMsg = (h?: string) => {
  if (!h) return "";
  try { return new TextDecoder().decode(getBytes("0x" + h.replace(/^0x/, ""))); } catch { return h; }
};

const abiAddr = (addr: string) => zeroPadValue(hexlify(tronToBytes(addr).slice(1)), 32).slice(2);

async function tronUsdtBalance(addr: string): Promise<number> {
  const r = await tron("/wallet/triggerconstantcontract", {
    owner_address: addr, contract_address: TRON.usdt, function_selector: "balanceOf(address)",
    parameter: abiAddr(addr), visible: true,
  });
  const hex = r?.constant_result?.[0];
  return hex ? Number(formatUnits(BigInt("0x" + hex), 6)) : 0;
}

async function tronTrxBalance(addr: string): Promise<number> {
  const r = await tron("/wallet/getaccount", { address: addr, visible: true });
  return Number(r?.balance ?? 0) / 1e6;
}

// ───────────────────────── EVM ─────────────────────────

function evmProvider(net: EvmNet) {
  const c = EVM[net];
  return new JsonRpcProvider(Deno.env.get(c.env) || c.rpc, c.chainId, { staticNetwork: true });
}

// ───────────────────────── API commune ─────────────────────────

export function fromAddress(net: Net, keyOverride?: string): string {
  if (net === "spl") throw new SafeError("Solana n'est pas encore pris en charge.");
  const key = keyFor(net, keyOverride);
  return net === "trc20" ? tronFromKey(key) : computeAddress(key);
}

export function validateAddress(net: Net, addr: string): void {
  if (net === "trc20") { tronToBytes(addr); return; }
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) throw new SafeError("Adresse de réception invalide pour ce réseau.");
}

export async function balances(net: Net): Promise<{ address: string; usdt: number; gas: number; gasSymbol: string; minGas: number }> {
  const address = fromAddress(net);
  if (net === "trc20") {
    const [usdt, gas] = await Promise.all([tronUsdtBalance(address), tronTrxBalance(address)]);
    return { address, usdt, gas, gasSymbol: "TRX", minGas: TRON.minTrx };
  }
  const c = EVM[net as EvmNet];
  const p = evmProvider(net as EvmNet);
  const token = new Contract(c.usdt, ERC20_ABI, p);
  const [raw, dec, wei] = await Promise.all([token.balanceOf(address), token.decimals(), p.getBalance(address)]);
  return { address, usdt: Number(formatUnits(raw, dec)), gas: Number(formatUnits(wei, 18)), gasSymbol: c.gas, minGas: c.minGas };
}

export interface Prepared { hash: string; broadcast: () => Promise<void> }

/** Construit et signe le transfert ; ne diffuse rien. */
export async function prepare(net: Net, to: string, amount: number, keyOverride?: string): Promise<Prepared> {
  validateAddress(net, to);
  const key = keyFor(net, keyOverride);
  const from = fromAddress(net, key);
  if (to.toLowerCase() === from.toLowerCase()) throw new SafeError("L'adresse de réception est celle du portefeuille d'Ooble.");

  if (net === "trc20") {
    const units = parseUnits(amount.toFixed(6), 6);
    const parameter = abiAddr(to) + zeroPadValue(toBeHex(units), 32).slice(2);
    const r = await tron("/wallet/triggersmartcontract", {
      owner_address: from, contract_address: TRON.usdt, function_selector: "transfer(address,uint256)",
      parameter, fee_limit: TRON.feeLimit, call_value: 0, visible: true,
    });
    const tx = r?.transaction;
    if (!r?.result?.result || !tx?.txID) throw new SafeError(`Tron : transaction refusée (${hexMsg(r?.result?.message) || "inconnue"}).`);
    // Le nœud a construit la transaction : on vérifie ce qu'on va signer.
    if (sha256("0x" + tx.raw_data_hex).slice(2) !== tx.txID) throw new SafeError("Tron : empreinte de transaction incohérente.");
    const v = tx.raw_data?.contract?.[0]?.parameter?.value ?? {};
    if (v.contract_address !== TRON.usdt || v.owner_address !== from || v.data !== "a9059cbb" + parameter) {
      throw new SafeError("Tron : transaction construite différente de la demande.");
    }
    const sig = new SigningKey(key).sign("0x" + tx.txID);
    const signature = sig.r.slice(2) + sig.s.slice(2) + sig.v.toString(16);
    return {
      hash: tx.txID,
      broadcast: async () => {
        const b = await tron("/wallet/broadcasttransaction", { ...tx, signature: [signature] });
        if (!b?.result) {
          const msg = `${b?.code ?? ""} ${hexMsg(b?.message)}`.trim();
          // Ces refus du nœud garantissent que rien n'est parti.
          if (/SIGERROR|BANDWITH_ERROR|CONTRACT_VALIDATE_ERROR|TAPOS_ERROR|TOO_BIG|EXPIRATION/i.test(msg)) throw new SafeError(`Tron : ${msg}`);
          throw new Error(`Tron : diffusion incertaine (${msg || "sans réponse"}).`);
        }
      },
    };
  }

  const c = EVM[net as EvmNet];
  const p = evmProvider(net as EvmNet);
  const wallet = new Wallet(key, p);
  const token = new Contract(c.usdt, ERC20_ABI, wallet);
  const dec: bigint = await token.decimals();
  const units = parseUnits(amount.toFixed(6), dec);
  let req;
  try {
    req = await wallet.populateTransaction(await token.transfer.populateTransaction(to, units));
  } catch (e) {
    throw new SafeError(`Préparation impossible : ${(e as Error).message?.slice(0, 180)}`);
  }
  const signed = await wallet.signTransaction(req);
  return {
    hash: keccak256(signed),
    broadcast: async () => {
      try {
        await p.broadcastTransaction(signed);
      } catch (e) {
        const code = (e as { code?: string }).code ?? "";
        if (["INSUFFICIENT_FUNDS", "NONCE_EXPIRED", "REPLACEMENT_UNDERPRICED", "CALL_EXCEPTION"].includes(code)) {
          throw new SafeError(`Refusé par le réseau (${code}).`);
        }
        throw new Error(`Diffusion incertaine : ${(e as Error).message?.slice(0, 180)}`);
      }
    },
  };
}

/** État d'une transaction : confirmée, échouée ou pas encore incluse. */
export async function txState(net: Net, hash: string): Promise<"success" | "reverted" | "pending"> {
  if (net === "trc20") {
    const r = await tron("/wallet/gettransactioninfobyid", { value: hash });
    if (!r?.blockNumber) return "pending";
    return r?.receipt?.result === "SUCCESS" ? "success" : "reverted";
  }
  const rc = await evmProvider(net as EvmNet).getTransactionReceipt(hash);
  if (!rc) return "pending";
  return rc.status === 1 ? "success" : "reverted";
}

/**
 * Diagnostic sans clé ni fonds : joint chaque réseau et construit (sans la
 * diffuser) une transaction depuis une clé jetable, pour vérifier la chaîne
 * complète de préparation et de signature.
 */
export async function health(): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  const temp = Wallet.createRandom().privateKey;
  for (const net of SUPPORTED) {
    try {
      if (net === "trc20") {
        const b = await tron("/wallet/getnowblock", {});
        let build: string;
        try { const t = await prepare(net, TRON.usdt, 1, temp); build = `signée ${t.hash.slice(0, 10)}…`; }
        catch (e) { build = (e as Error).message; }
        out[net] = { ok: true, block: b?.block_header?.raw_data?.number, build };
      } else {
        const c = EVM[net as EvmNet];
        const p = evmProvider(net as EvmNet);
        const [block, dec] = await Promise.all([p.getBlockNumber(), new Contract(c.usdt, ERC20_ABI, p).decimals()]);
        out[net] = { ok: true, block, usdtDecimals: Number(dec) };
      }
    } catch (e) {
      out[net] = { ok: false, error: (e as Error).message?.slice(0, 200) };
    }
  }
  return out;
}
