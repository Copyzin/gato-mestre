"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cat, Loader2, LogOut, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { MatchWithSport, Sport, TipWithMatch } from "@shared/index";
import type { ApiError } from "@shared/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TOKEN_KEY } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

const RESULT_LABEL: Record<TipWithMatch["result"], string> = {
  won: "Green",
  lost: "Red",
  void: "Void",
  pending: "Pendente",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [tips, setTips] = useState<TipWithMatch[]>([]);
  const [suggestions, setSuggestions] = useState<TipWithMatch[]>([]);
  const [matches, setMatches] = useState<MatchWithSport[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const authHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const load = useCallback(
    async (t: string) => {
      const headers = { Authorization: `Bearer ${t}` };
      const [tipsRes, suggestionsRes, matchesRes, sportsRes] = await Promise.all([
        fetch(`${API_URL}/admin/tips`, { headers }),
        fetch(`${API_URL}/admin/tips?status=draft`, { headers }),
        fetch(`${API_URL}/admin/matches`, { headers }),
        fetch(`${API_URL}/sports`),
      ]);

      if (tipsRes.status === 401 || suggestionsRes.status === 401 || matchesRes.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        router.replace("/admin/login");
        return;
      }

      setTips(await tipsRes.json());
      setSuggestions(await suggestionsRes.json());
      setMatches(await matchesRes.json());
      setSports(await sportsRes.json());
      setLoading(false);
    },
    [router]
  );

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      router.replace("/admin/login");
      return;
    }
    setToken(t);
    load(t).catch(() => {
      setNotice({ kind: "error", text: "Falha ao carregar. A API está no ar?" });
      setLoading(false);
    });
  }, [load, router]);

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    router.replace("/admin/login");
  }

  async function setResult(tip: TipWithMatch, result: "won" | "lost" | "void") {
    if (tip.result !== "pending") {
      const score =
        tip.match.homeScore !== null && tip.match.awayScore !== null
          ? `${tip.match.homeScore} x ${tip.match.awayScore}`
          : "x";
      const current = `${RESULT_LABEL[tip.result]}${tip.settledBy ? ` (${tip.settledBy})` : ""}`;
      const ok = window.confirm(
        `Confirmar correção manual? ${tip.match.homeTeam} ${score} ${tip.match.awayTeam} — resultado atual: ${current}`
      );
      if (!ok) return;
    }
    const res = await fetch(`${API_URL}/admin/tips/${tip.id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ result }),
    });
    if (res.ok) {
      setTips((prev) =>
        prev.map((t) => (t.id === tip.id ? { ...t, result, settledBy: "admin" } : t))
      );
    } else {
      setNotice({ kind: "error", text: "Não foi possível atualizar o resultado." });
    }
  }

  async function runIngest() {
    if (!token) return;
    setIngesting(true);
    setNotice(null);
    try {
      const res = await fetch(`${API_URL}/admin/ingest`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ task: "all" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as Partial<ApiError>;
        setNotice({ kind: "error", text: data.error ?? "Falha ao coletar dados." });
        return;
      }
      const data = (await res.json()) as {
        summary?: {
          fixtures?: { upserted?: number };
          suggestions?: { suggested?: number };
          settle?: { settled?: number };
        };
      };
      const s = data.summary ?? {};
      setNotice({
        kind: "ok",
        text: `Coleta concluída: ${s.fixtures?.upserted ?? 0} jogos, ${s.suggestions?.suggested ?? 0} sugestões, ${s.settle?.settled ?? 0} apuradas.`,
      });
      await load(token);
    } catch {
      setNotice({ kind: "error", text: "Falha ao coletar dados. A API está no ar?" });
    } finally {
      setIngesting(false);
    }
  }

  async function deleteTip(tipId: number) {
    if (!window.confirm("Excluir esta dica? Essa ação não pode ser desfeita.")) return;
    const res = await fetch(`${API_URL}/admin/tips/${tipId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.ok) {
      setTips((prev) => prev.filter((t) => t.id !== tipId));
    } else {
      setNotice({ kind: "error", text: "Não foi possível excluir a dica." });
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 aria-hidden className="h-6 w-6 animate-spin text-zinc-500" />
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl bg-zinc-950 px-4 py-6 text-zinc-50">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cat aria-hidden className="h-5 w-5 text-green-500" />
          <span className="text-sm font-bold">Painel Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={runIngest} disabled={ingesting}>
            {ingesting ? (
              <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw aria-hidden className="h-3.5 w-3.5" />
            )}
            {ingesting ? "Coletando jogos e sugestões…" : "Atualizar dados"}
          </Button>
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-50">
            Ver site
          </Link>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut aria-hidden className="h-3.5 w-3.5" />
            Sair
          </Button>
        </div>
      </div>

      {notice && (
        <p
          role="alert"
          className={`mb-4 rounded-md border px-3 py-2 text-sm ${
            notice.kind === "ok"
              ? "border-green-500/30 text-green-500"
              : "border-red-500/30 text-red-500"
          }`}
        >
          {notice.text}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <NewTipForm
          matches={matches}
          headers={authHeaders()}
          onCreated={() => token && load(token)}
          onError={(text) => setNotice({ kind: "error", text })}
        />
        <NewMatchForm
          sports={sports}
          headers={authHeaders()}
          onCreated={() => token && load(token)}
          onError={(text) => setNotice({ kind: "error", text })}
        />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-zinc-400">
        Sugestões ({suggestions.length})
      </h2>
      <div className="flex flex-col gap-2">
        {suggestions.map((tip) => (
          <SuggestionItem
            key={tip.id}
            tip={tip}
            headers={authHeaders()}
            onDone={() => token && load(token)}
            onError={(text) => setNotice({ kind: "error", text })}
          />
        ))}
        {suggestions.length === 0 && (
          <p className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-center text-sm text-zinc-500">
            Sem sugestões novas — rode Atualizar dados.
          </p>
        )}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-zinc-400">
        Dicas publicadas ({tips.filter((t) => t.status === "published").length})
      </h2>
      <div className="flex flex-col gap-2">
        {tips.filter((t) => t.status === "published").map((tip) => (
          <div
            key={tip.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm"
          >
            <span aria-hidden>{tip.sport.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {tip.match.homeTeam} x {tip.match.awayTeam}
              </p>
              <p className="truncate text-xs text-zinc-500">
                {tip.title} · odd{" "}
                <span className="tabular-nums">
                  {tip.odds !== null ? tip.odds.toFixed(2) : "—"}
                </span>{" "}
                · {formatDateTime(tip.match.startTime)}
              </p>
            </div>

            <span className="flex items-center gap-1">
              <ResultBadge result={tip.result} />
              {tip.settledBy && (
                <span className="rounded bg-zinc-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-zinc-400">
                  {tip.settledBy === "auto" ? "Auto" : "Admin"}
                </span>
              )}
            </span>

            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => setResult(tip, "won")} className="text-green-500">
                Green
              </Button>
              <Button size="sm" variant="outline" onClick={() => setResult(tip, "lost")} className="text-red-500">
                Red
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setResult(tip, "void")}>
                Void
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteTip(tip.id)}
                aria-label="Excluir dica"
                className="text-zinc-500 hover:text-red-500"
              >
                <Trash2 aria-hidden className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {tips.filter((t) => t.status === "published").length === 0 && (
          <p className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-center text-sm text-zinc-500">
            Nenhuma dica publicada.
          </p>
        )}
      </div>
    </main>
  );
}

type SuggestionProps = {
  tip: TipWithMatch;
  headers: Record<string, string>;
  onDone: () => void;
  onError: (text: string) => void;
};

function SuggestionItem({ tip, headers, onDone, onError }: SuggestionProps) {
  const [odds, setOdds] = useState(tip.odds !== null ? tip.odds.toFixed(2) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    setBusy(true);
    setError(null);
    const body: { status: "published"; odds?: number } = { status: "published" };
    if (odds.trim() !== "") body.odds = Number(odds);
    const res = await fetch(`${API_URL}/admin/tips/${tip.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) {
      onDone();
    } else {
      const data = (await res.json().catch(() => ({}))) as Partial<ApiError>;
      setError(data.error ?? "Não foi possível publicar a sugestão.");
    }
  }

  async function discard() {
    if (!window.confirm("Descartar esta sugestão? Ela será excluída.")) return;
    setBusy(true);
    const res = await fetch(`${API_URL}/admin/tips/${tip.id}`, {
      method: "DELETE",
      headers,
    });
    setBusy(false);
    if (res.ok) {
      onDone();
    } else {
      onError("Não foi possível descartar a sugestão.");
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span aria-hidden>{tip.sport.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {tip.match.homeTeam} x {tip.match.awayTeam}
          </p>
          <p className="truncate text-xs text-zinc-500">
            {tip.sport.name} · {tip.match.league} · {formatDateTime(tip.match.startTime)}
          </p>
          <p className="mt-0.5 truncate text-xs text-zinc-300">{tip.title}</p>
        </div>

        {tip.probability !== null && (
          <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-green-500">
            {Math.round(tip.probability)}%
          </span>
        )}

        <div className="flex items-center gap-1.5">
          <Label htmlFor={`sug-odds-${tip.id}`} className="sr-only">
            Odd
          </Label>
          <Input
            id={`sug-odds-${tip.id}`}
            type="number"
            step="0.01"
            min="1.01"
            max="1000"
            placeholder="Odd"
            value={odds}
            onChange={(e) => setOdds(e.target.value)}
            className="h-8 w-24 tabular-nums"
          />
          <Button size="sm" onClick={publish} disabled={busy}>
            {busy && <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />}
            Publicar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={discard}
            disabled={busy}
            className="text-zinc-500 hover:text-red-500"
          >
            Descartar
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

function ResultBadge({ result }: { result: TipWithMatch["result"] }) {
  if (result === "won")
    return <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-500">Green</span>;
  if (result === "lost")
    return <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-500">Red</span>;
  if (result === "void")
    return <span className="rounded bg-zinc-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-zinc-400">Void</span>;
  return <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-500">Pendente</span>;
}

type FormProps = {
  headers: Record<string, string>;
  onCreated: () => void;
  onError: (text: string) => void;
};

function NewTipForm({ matches, headers, onCreated, onError }: FormProps & { matches: MatchWithSport[] }) {
  const [matchId, setMatchId] = useState("");
  const [title, setTitle] = useState("");
  const [odds, setOdds] = useState("");
  const [confidence, setConfidence] = useState("medium");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`${API_URL}/admin/tips`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        matchId: Number(matchId),
        title,
        odds: Number(odds),
        confidence,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMatchId("");
      setTitle("");
      setOdds("");
      onCreated();
    } else {
      const data = await res.json().catch(() => ({}));
      onError(data.error ?? "Não foi possível criar a dica.");
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
        <Plus aria-hidden className="h-4 w-4 text-green-500" />
        Nova dica
      </h2>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tip-match">Jogo</Label>
          <Select id="tip-match" required value={matchId} onChange={(e) => setMatchId(e.target.value)}>
            <option value="">Selecione o jogo…</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.sport.icon} {m.homeTeam} x {m.awayTeam} — {formatDateTime(m.startTime)}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tip-title">Mercado / título</Label>
          <Input
            id="tip-title"
            required
            maxLength={200}
            placeholder="Ex.: Ambas marcam"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tip-odds">Odd</Label>
            <Input
              id="tip-odds"
              required
              type="number"
              step="0.01"
              min="1.01"
              max="1000"
              placeholder="1.85"
              value={odds}
              onChange={(e) => setOdds(e.target.value)}
              className="tabular-nums"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tip-confidence">Confiança</Label>
            <Select id="tip-confidence" value={confidence} onChange={(e) => setConfidence(e.target.value)}>
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </Select>
          </div>
        </div>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
          Publicar dica
        </Button>
      </div>
    </form>
  );
}

function NewMatchForm({ sports, headers, onCreated, onError }: FormProps & { sports: Sport[] }) {
  const [sportId, setSportId] = useState("");
  const [league, setLeague] = useState("");
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [startTime, setStartTime] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`${API_URL}/admin/matches`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sportId: Number(sportId),
        league,
        homeTeam,
        awayTeam,
        startTime: new Date(startTime).toISOString(),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setLeague("");
      setHomeTeam("");
      setAwayTeam("");
      setStartTime("");
      onCreated();
    } else {
      const data = await res.json().catch(() => ({}));
      onError(data.error ?? "Não foi possível criar o jogo.");
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
        <Plus aria-hidden className="h-4 w-4 text-green-500" />
        Novo jogo
      </h2>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="match-sport">Esporte</Label>
          <Select id="match-sport" required value={sportId} onChange={(e) => setSportId(e.target.value)}>
            <option value="">Selecione o esporte…</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon} {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="match-league">Liga</Label>
          <Input
            id="match-league"
            required
            maxLength={120}
            placeholder="Ex.: Brasileirão Série A"
            value={league}
            onChange={(e) => setLeague(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="match-home">Mandante</Label>
            <Input id="match-home" required maxLength={120} value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="match-away">Visitante</Label>
            <Input id="match-away" required maxLength={120} value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="match-start">Data e hora</Label>
          <Input
            id="match-start"
            required
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
          Cadastrar jogo
        </Button>
      </div>
    </form>
  );
}
