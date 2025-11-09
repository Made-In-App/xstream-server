# Deploy Automatico su Vercel

## Opzione 1: Integrazione Diretta Vercel-GitHub (CONSIGLIATA)

Questa è la soluzione più semplice e non richiede token.

### Step 1: Collega Repository a Vercel

**IMPORTANTE per Repository Privati:**

1. Vai su [vercel.com](https://vercel.com) e accedi
2. Vai su **Settings** > **Git** (o [vercel.com/account/git](https://vercel.com/account/git))
3. Clicca su **"Connect Git Provider"** o **"Add Git Provider"**
4. Seleziona **GitHub**
5. Autorizza Vercel e seleziona il repository privato `xstream-server`
6. Torna su **"Add New Project"**
7. Clicca su **"Import Git Repository"**
8. Ora vedrai il tuo repository privato nella lista

### Step 2: Configurazione Progetto

Vercel rileverà automaticamente:
- Framework: Other
- Build Command: `npm run build` (o lascia vuoto, Vercel compila automaticamente)
- Output Directory: (lascia vuoto)
- Install Command: `npm install`

### Step 3: Variabili d'Ambiente (Opzionale)

Se necessario, aggiungi nella sezione **Environment Variables**:
- `XSTREAM_URL` = `https://fn2ilpirata.rearc.xn--t60b56a`
- `XSTREAM_USERNAME` = `Emmgen2`
- `XSTREAM_PASSWORD` = `gJWB28F`
- `CACHE_DIR` = `/tmp/cache`

### Step 4: Deploy

Clicca su **"Deploy"**

### Risultato

Ora **ogni push su `main` o `master`** triggerà automaticamente un nuovo deploy su Vercel!

Vercel creerà anche:
- **Preview deployments** per ogni Pull Request
- **Production deployments** per ogni push su main/master

---

## Opzione 2: GitHub Actions (Alternativa)

Se preferisci usare GitHub Actions invece dell'integrazione diretta:

### Step 1: Ottieni Vercel Token

1. Vai su Vercel > **Settings** > **Tokens**
2. Clicca su **"Create Token"**
3. Dai un nome (es. "GitHub Actions")
4. Copia il token generato

### Step 2: Aggiungi Secret su GitHub

1. Vai su GitHub > Il tuo repository > **Settings**
2. Clicca su **Secrets and variables** > **Actions**
3. Clicca su **"New repository secret"**
4. Nome: `VERCEL_TOKEN`
5. Valore: incolla il token copiato da Vercel
6. Clicca **"Add secret"**

### Step 3: Verifica Workflow

Il file `.github/workflows/deploy.yml` è già configurato e funzionerà automaticamente.

### Risultato

Ogni push su `main` o `master` triggerà il workflow GitHub Actions che farà il deploy su Vercel.

---

## Verifica Deploy Automatico

Dopo aver configurato, prova:

```bash
# Fai una modifica
echo "# Test" >> README.md

# Commit e push
git add .
git commit -m "Test deploy automatico"
git push origin main
```

Poi controlla:
- **Vercel Dashboard**: vedrai un nuovo deploy in corso
- **GitHub Actions**: vedrai il workflow in esecuzione (se usi Opzione 2)

---

## Quale Opzione Scegliere?

**Opzione 1 (Integrazione Diretta)** - CONSIGLIATA:
- ✅ Più semplice
- ✅ Non richiede token
- ✅ Gestione automatica di preview deployments
- ✅ Dashboard integrata

**Opzione 2 (GitHub Actions)**:
- ✅ Più controllo sul processo
- ✅ Puoi personalizzare il workflow
- ❌ Richiede configurazione token
- ❌ Più complesso

---

## Troubleshooting

### Deploy non parte automaticamente
- Verifica che il repository sia collegato a Vercel
- Controlla che stai facendo push su `main` o `master`
- Verifica i log nella dashboard Vercel

### Errore: Build failed
- Controlla che `npm run build` funzioni localmente
- Verifica i log nella dashboard Vercel
- Controlla le variabili d'ambiente

### Errore: VERCEL_TOKEN not found
- Verifica che il secret sia configurato correttamente su GitHub
- Controlla che il nome sia esattamente `VERCEL_TOKEN`

