# Deploy Repository Privato su Vercel

## Passaggi per Collegare Repository Privato

### Step 1: Autorizza Vercel su GitHub

1. Vai su [vercel.com](https://vercel.com) e accedi
2. Vai su **Settings** > **Git** (o direttamente [vercel.com/account/git](https://vercel.com/account/git))
3. Clicca su **"Connect Git Provider"** o **"Add Git Provider"**
4. Seleziona **GitHub**
5. GitHub ti chiederà di autorizzare Vercel
6. **IMPORTANTE**: Seleziona le opzioni:
   - ✅ **"Only select repositories"** (più sicuro)
   - Seleziona il tuo repository `xstream-server`
   - Oppure seleziona **"All repositories"** se vuoi dare accesso completo
7. Clicca **"Authorize"** o **"Install"**

### Step 2: Importa il Repository

1. Torna su [vercel.com](https://vercel.com)
2. Clicca su **"Add New Project"**
3. Ora vedrai il tuo repository privato nella lista
4. Clicca su **"Import"** accanto al repository `xstream-server`

### Step 3: Configurazione Progetto

Vercel rileverà automaticamente:
- **Framework**: Other
- **Build Command**: `npm run build` (già configurato in vercel.json)
- **Output Directory**: (lascia vuoto)
- **Install Command**: `npm install`

### Step 4: Variabili d'Ambiente

Nella sezione **Environment Variables**, aggiungi se necessario:

```
XSTREAM_URL=https://fn2ilpirata.rearc.xn--t60b56a
XSTREAM_USERNAME=Emmgen2
XSTREAM_PASSWORD=gJWB28F
CACHE_DIR=/tmp/cache
```

### Step 5: Deploy

1. Clicca su **"Deploy"**
2. Vercel farà il build e il deploy automaticamente

### Step 6: Verifica Deploy Automatico

Ora ogni push su `main` o `master` triggerà automaticamente un nuovo deploy!

---

## Se Non Vedi il Repository

Se dopo l'autorizzazione non vedi il repository:

1. Vai su **Settings** > **Git** su Vercel
2. Clicca su **"Configure"** accanto a GitHub
3. Verifica che il repository sia selezionato
4. Se necessario, clicca su **"Reinstall"** o **"Update permissions"**
5. Seleziona di nuovo il repository e autorizza

---

## Permessi GitHub App

L'app GitHub di Vercel richiede questi permessi:
- ✅ **Read access** ai repository (per clonare il codice)
- ✅ **Write access** ai repository (per creare webhook e commit status)
- ✅ **Read access** ai metadata (per informazioni repository)

Questi permessi sono necessari per:
- Clonare il repository
- Creare webhook per deploy automatico
- Aggiornare lo status dei commit

---

## Sicurezza Repository Privato

✅ **Vercel rispetta la privacy:**
- Il codice viene clonato solo durante il build
- I file non vengono esposti pubblicamente
- Le variabili d'ambiente sono criptate
- Puoi revocare l'accesso in qualsiasi momento

✅ **Best Practices:**
- Usa variabili d'ambiente per credenziali sensibili
- Non committare file con password o token
- Usa `.gitignore` per file sensibili
- Rivedi periodicamente i permessi su GitHub

---

## Troubleshooting

### Errore: "Repository not found"
- Verifica che l'app GitHub di Vercel sia installata
- Controlla che il repository sia selezionato nelle autorizzazioni
- Prova a reinstallare l'app GitHub

### Errore: "Permission denied"
- Vai su GitHub > Settings > Applications > Authorized OAuth Apps
- Trova "Vercel" e verifica i permessi
- Se necessario, revoca e riautorizza

### Deploy non parte automaticamente
- Verifica che stai facendo push su `main` o `master`
- Controlla i webhook su GitHub: Settings > Webhooks
- Dovresti vedere un webhook di Vercel

---

## Revocare Accesso

Se vuoi rimuovere l'accesso di Vercel:

1. Vai su GitHub > Settings > Applications > Authorized OAuth Apps
2. Trova "Vercel"
3. Clicca su **"Revoke"**

Oppure:

1. Vai su Vercel > Settings > Git
2. Clicca su **"Disconnect"** accanto a GitHub

