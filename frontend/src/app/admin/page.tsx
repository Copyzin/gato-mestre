"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cat, Loader2, LogOut, Plus, Trash2 } from "lucide-react";
import type { MatchWithSport, Sport, TipWithMatch } from "@shared/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TOKEN_KEY } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

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
  const [matches, setMatches] = useState<MatchWithSport[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
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
      const [tipsRes, matchesRes, sportsRes] = await Promise.all([
        fetch(`${API_URL}/admin/tips`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${API_URL}/admin/matches`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${API_URL}/sports`),
      ]);

      if (tipsRes.status === 401 || matchesRes.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        router.replace("/admin/login");
        return;
      }

      setTips(await tipsRes.json());
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

  async function setResult(tipId: number, result: "won" | "lost" | "void") {
    const res = await fetch(`${API_URL}/admin/tips/${tipId}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ result }),
    });
    if (res.ok) {
      setTips((prev) => prev.map((t) => (t.id === tipId ? { ...t, result } : t)));
    } else {
      setNotice({ kind: "error", text: "Não foi possível atualizar o resultado." });
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
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 aria-hidden className="h-6 w-6 animate-spin text-zinc-500" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cat aria-hidden className="h-5 w-5 text-green-500" />
          <span className="text-sm font-bold">Painel Admin</span>
        </div>
        <div className="flex items-center gap-2">
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
        Dicas ({tips.length})
      </h2>
      <div className="flex flex-col gap-2">
        {tips.map((tip) => (
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
                <span className="tabular-nums">{tip.odds.toFixed(2)}</span> ·{" "}
                {formatDateTime(tip.match.startTime)}
              </p>
            </div>

            <ResultBadge result={tip.result} />

            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => setResult(tip.id, "won")} className="text-green-500">
                Green
              </Button>
              <Button size="sm" variant="outline" onClick={() => setResult(tip.id, "lost")} className="text-red-500">
                Red
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setResult(tip.id, "void")}>
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
        {tips.length === 0 && (
          <p className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-center text-sm text-zinc-500">
            Nenhuma dica cadastrada.
          </p>
        )}
      </div>
    </main>
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
