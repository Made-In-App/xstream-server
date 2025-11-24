# Guida al Deploy su Oracle Cloud Free Tier

Questa guida ti aiuterà a deployare l'applicazione IPTV Proxy su una istanza Oracle Cloud Free Tier.

## Prerequisiti

1. Un account Oracle Cloud con istanza Free Tier attiva
2. Accesso SSH all'istanza
3. Docker e Docker Compose installati sull'istanza

## Passo 1: Preparare l'istanza Oracle Cloud

### 1.1 Configurare le Security Rules

1. Vai su Oracle Cloud Console → Networking → Virtual Cloud Networks
2. Seleziona la tua VCN
3. Vai su Security Lists → Default Security List
4. Aggiungi una Ingress Rule:
   - **Source Type**: CIDR
   - **Source CIDR**: `0.0.0.0/0` (o un range più specifico per sicurezza)
   - **IP Protocol**: TCP
   - **Destination Port Range**: `8080`
   - **Description**: "IPTV Proxy HTTP"

### 1.2 Ottenere l'IP Pubblico

1. Vai su Compute → Instances
2. Seleziona la tua istanza
3. Copia l'IP Pubblico (es: `123.456.789.012`)

## Passo 2: Connettersi all'istanza

```bash
ssh opc@<IP_PUBBLICO>
```

## Passo 3: Installare Docker e Docker Compose

```bash
# Aggiorna il sistema
sudo yum update -y

# Installa Docker
sudo yum install -y docker-engine
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker opc

# Installa Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Riconnettiti per applicare i cambiamenti del gruppo
exit
```

Riconnettiti con SSH:
```bash
ssh opc@<IP_PUBBLICO>
```

Verifica l'installazione:
```bash
docker --version
docker-compose --version
```

## Passo 4: Clonare o Caricare il Progetto

### Opzione A: Se hai il progetto su Git

```bash
cd ~
git clone <URL_DEL_TUO_REPO>
cd xstream-server
```

### Opzione B: Se devi caricare il progetto manualmente

1. Crea la directory del progetto:
```bash
mkdir -p ~/xstream-server
cd ~/xstream-server
```

2. Carica i file del progetto usando `scp` dal tuo computer locale:
```bash
# Dal tuo computer locale
scp -r /Users/emanuelegennuso/LAVORO/PROGETTI/MIEI/xstream-server/* opc@<IP_PUBBLICO>:~/xstream-server/
```

## Passo 5: Configurare docker-compose.yml

Modifica il file `docker-compose.yml` con le tue configurazioni:

```bash
nano docker-compose.yml
```

Esempio di configurazione:

```yaml
version: "3"
services:
  iptv-proxy:
    build:
      context: .
      dockerfile: Dockerfile
    volumes:
      - ./iptv:/root/iptv
    container_name: "iptv-proxy"
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      # Se usi un file M3U remoto
      M3U_URL: https://example.com/get.php?username=user&password=pass&type=m3u_plus&output=m3u8
      # Oppure se usi un file locale (metti il file in ./iptv/iptv.m3u)
      # M3U_URL: /root/iptv/iptv.m3u
      
      # Porta su cui il proxy ascolta
      PORT: 8080
      
      # Hostname o IP pubblico della tua istanza Oracle
      HOSTNAME: <IL_TUO_IP_PUBBLICO>
      
      GIN_MODE: release
      
      # Configurazione Xtream-code proxy (opzionale)
      # XTREAM_USER: xtream_user
      # XTREAM_PASSWORD: xtream_password
      # XTREAM_BASE_URL: "http://example.tv:8080"
      
      # Credenziali per accedere al proxy
      USER: <TUO_USERNAME>
      PASSWORD: <TUA_PASSWORD_SICURA>
```

**IMPORTANTE**: 
- Sostituisci `<IL_TUO_IP_PUBBLICO>` con l'IP pubblico della tua istanza
- Sostituisci `<TUO_USERNAME>` e `<TUA_PASSWORD_SICURA>` con credenziali sicure
- Configura `M3U_URL` con il tuo URL M3U o usa un file locale

## Passo 6: (Opzionale) Aggiungere file M3U locale

Se vuoi usare un file M3U locale invece di un URL remoto:

```bash
mkdir -p iptv
# Carica il tuo file M3U
# Esempio: scp iptv.m3u opc@<IP_PUBBLICO>:~/xstream-server/iptv/
```

E nel `docker-compose.yml` usa:
```yaml
M3U_URL: /root/iptv/iptv.m3u
```

## Passo 7: Buildare e Avviare il Container

```bash
# Builda l'immagine Docker
docker-compose build

# Avvia il container
docker-compose up -d

# Verifica che sia in esecuzione
docker-compose ps

# Controlla i log
docker-compose logs -f
```

## Passo 8: Testare l'Applicazione

Dalla tua macchina locale, testa l'endpoint:

```bash
# Sostituisci con il tuo IP pubblico e le tue credenziali
curl "http://<IP_PUBBLICO>:8080/iptv.m3u?username=<TUO_USERNAME>&password=<TUA_PASSWORD>"
```

Oppure apri nel browser:
```
http://<IP_PUBBLICO>:8080/iptv.m3u?username=<TUO_USERNAME>&password=<TUA_PASSWORD>
```

## Passo 9: Configurare Firewall (se necessario)

Se il firewall è attivo, apri la porta 8080:

```bash
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

## Comandi Utili

### Visualizzare i log
```bash
docker-compose logs -f iptv-proxy
```

### Fermare il container
```bash
docker-compose down
```

### Riavviare il container
```bash
docker-compose restart
```

### Ricostruire dopo modifiche
```bash
docker-compose up -d --build
```

### Aggiornare l'applicazione
```bash
cd ~/xstream-server
git pull  # se usi git
docker-compose up -d --build
```

## Troubleshooting

### Il container non si avvia
```bash
# Controlla i log per errori
docker-compose logs iptv-proxy

# Verifica la configurazione
docker-compose config
```

### Non riesco a connettermi dall'esterno
1. Verifica le Security Rules su Oracle Cloud Console
2. Verifica che il firewall locale permetta la porta 8080
3. Verifica che il container sia in esecuzione: `docker-compose ps`

### Problemi con il file M3U
- Verifica che l'URL M3U sia accessibile dalla VM
- Se usi un file locale, verifica che sia nella directory `./iptv/`
- Controlla i permessi del file

## Sicurezza

⚠️ **IMPORTANTE**: 
- Cambia le credenziali di default (`USER` e `PASSWORD`)
- Considera di usare HTTPS con un reverse proxy (Traefik/Nginx)
- Limita l'accesso alle Security Rules solo agli IP che ti servono
- Non esporre credenziali sensibili nel docker-compose.yml (usa variabili d'ambiente o file .env)

## Prossimi Passi

- Configurare un dominio e HTTPS usando Traefik (vedi `traefik/docker-compose.yml`)
- Impostare backup automatici
- Configurare monitoring

