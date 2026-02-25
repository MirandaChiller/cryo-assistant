# CRYO — Assistente de Vendas · Chiller Peças

Assistente de IA em tempo real para apoiar o time de televendas durante atendimentos.  
Powered by Groq + LLaMA 3.3 70B. Treinado com dados reais de conversão da Chiller Peças.

---

## DEPLOY EM PRODUÇÃO — PASSO A PASSO

### 1. Subir para o GitHub

```bash
# No terminal, dentro da pasta do projeto:
git init
git add .
git commit -m "feat: CRYO assistente de vendas v1.0"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/cryo-assistant.git
git push -u origin main
```

### 2. Importar no Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em **Add New Project**
3. Conecte seu GitHub e selecione o repositório `cryo-assistant`
4. Clique em **Deploy** — o Vercel detecta automaticamente que é Vite

### 3. Configurar a variável de ambiente

1. No painel do projeto no Vercel, vá em **Settings → Environment Variables**
2. Adicione:
   - **Name:** `GROQ_API_KEY`
   - **Value:** `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`
   - **Environments:** Production, Preview, Development
3. Clique em **Save**
4. Vá em **Deployments** e clique em **Redeploy** para aplicar a variável

### 4. Pronto

O assistente estará disponível na URL gerada pelo Vercel.  
Compartilhe com o time de vendas — acessa pelo navegador do celular ou computador.

---

## DESENVOLVIMENTO LOCAL

```bash
npm install

# Crie o arquivo de variáveis locais
cp .env.example .env.local
# Edite .env.local e coloque sua GROQ_API_KEY

npm run dev
# Acesse http://localhost:5173
```

---

## ESTRUTURA DO PROJETO

```
cryo-assistant/
├── api/
│   └── chat.js          # Serverless function — chama o Groq (chave protegida)
├── src/
│   ├── main.jsx         # Entrada React
│   └── App.jsx          # Interface completa do CRYO
├── index.html
├── vite.config.js
├── vercel.json
└── package.json
```

---

## FUNCIONALIDADES

- **8 atalhos de objeção** — resposta imediata para as situações mais comuns
- **Chat livre** — descreva qualquer situação do atendimento
- **Aba Dados do Funil** — estatísticas reais de Jan/2026 com funil visual
- **Novo atendimento** — reinicia o contexto entre clientes
- **API key protegida** — nunca exposta no frontend

---

## ATUALIZAÇÕES FUTURAS

Para adicionar novos dados mensais ao sistema de conhecimento, edite o `SYSTEM_PROMPT` em `api/chat.js`.
