"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Cat, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TOKEN_KEY } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Falha no login. Tente novamente.");
        return;
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      router.push("/admin");
    } catch {
      setError("Não foi possível conectar à API. Verifique se o backend está rodando.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900 p-8">
        <div className="mb-6 flex items-center gap-2">
          <Cat aria-hidden className="h-5 w-5 text-green-500" />
          <span className="text-sm font-bold">Gato Mestre</span>
          <span className="text-xs text-zinc-500">· Admin</span>
        </div>

        <h1 className="text-lg font-semibold">Entrar no painel</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Acesso restrito a administradores.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-500">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading}>
            {loading && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
            Entrar
          </Button>
        </form>
      </div>
    </main>
  );
}
