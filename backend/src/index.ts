import { buildApp } from "./app";

// Entry do Worker. A conexão com o banco é criada por request a partir do
// env (ver src/app.ts) — em testes, o app é montado com db injetado.
export default buildApp();
