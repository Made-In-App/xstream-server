# Come Funziona il Load Balancing

## Panoramica

Il sistema di load balancing distribuisce le richieste di streaming tra 5 server Xtream diversi usando un algoritmo **round-robin** semplice.

## Meccanismo di Funzionamento

### 1. Round-Robin Counter

Il sistema usa un contatore globale thread-safe (`xtreamServerCounter`) che viene incrementato ad ogni richiesta:

```go
var xtreamServerCounter int64 = 0
var xtreamServerCounterLock = sync.Mutex{}

func selectXtreamServer() string {
    xtreamServerCounterLock.Lock()
    serverIndex := int(xtreamServerCounter % int64(len(c.XtreamBaseURLs)))
    xtreamServerCounter++
    xtreamServerCounterLock.Unlock()
    
    return c.XtreamBaseURLs[serverIndex]
}
```

### 2. Come Funziona

- **Prima richiesta**: `counter = 0` → Server 0 (indice 0)
- **Seconda richiesta**: `counter = 1` → Server 1 (indice 1)
- **Terza richiesta**: `counter = 2` → Server 2 (indice 2)
- **Quarta richiesta**: `counter = 3` → Server 3 (indice 3)
- **Quinta richiesta**: `counter = 4` → Server 4 (indice 4)
- **Sesta richiesta**: `counter = 5` → Server 0 (indice 0) - ricomincia il ciclo

### 3. Quando Viene Applicato

Il load balancing viene applicato **solo alle richieste di streaming** (non alle API):

- `/USER/PASSWORD/:id` - Streaming diretto
- `/live/USER/PASSWORD/:id` - Live streaming
- `/movie/USER/PASSWORD/:id` - Film
- `/series/USER/PASSWORD/:id` - Serie TV
- `/timeshift/USER/PASSWORD/:duration/:start/:id` - Timeshift

### 4. Redirect Mode

Quando `REDIRECT_MODE: "true"`:

1. Il proxy seleziona un server usando round-robin
2. Costruisce l'URL completo con le credenziali
3. Fa un **redirect HTTP 302** al client
4. Il client si connette **direttamente** al server Xtream selezionato
5. Il flusso video **non passa** attraverso il proxy (meno carico sul server)

**Esempio:**
```
Client → Proxy: GET /notv_93me22/x7g35zhh/12345
Proxy → Client: 302 Redirect → http://muti14.fonsecatemp.com/notv_93me22/x7g35zhh/12345
Client → Server Xtream: Streaming diretto
```

### 5. Limitazioni Attuali

⚠️ **Il sistema NON controlla:**
- Se un server è già connesso a un client
- Se un server è sovraccarico
- Se un server è offline
- La latenza o la qualità del server

È un **round-robin puro**: ogni richiesta prende il prossimo server nella lista, indipendentemente dallo stato.

### 6. Vantaggi

✅ **Distribuzione equa**: Ogni server riceve circa lo stesso numero di richieste
✅ **Semplicità**: Nessuna logica complessa, funziona sempre
✅ **Performance**: In redirect mode, il proxy non deve gestire il traffico video

### 7. Configurazione

Nel `docker-compose.yml`:

```yaml
XTREAM_BASE_URLS: "http://server1/user1/pass1,http://server2/user2/pass2,..."
REDIRECT_MODE: "true"  # Redirect diretto al server selezionato
```

Ogni URL nella lista può contenere già username/password nel path (per account multipli).

