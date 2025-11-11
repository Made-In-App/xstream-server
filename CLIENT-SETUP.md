# Configurazione Client Xtream

## URL e Credenziali

Per configurare un client IPTV compatibile Xtream Codes, usa questi dati:

### Dati di Accesso

- **Server URL**: `https://xstream-server.fly.dev`
- **Username**: `Emmgen2`
- **Password**: `gJWB28F`

### URL Completi per Client Specifici

#### Per client che richiedono URL completi:

**M3U Playlist:**
```
https://xstream-server.fly.dev/get.php?username=Emmgen2&password=gJWB28F&type=m3u
```

**M3U Plus (Live + VOD + Series):**
```
https://xstream-server.fly.dev/get.php?username=Emmgen2&password=gJWB28F&type=m3u_plus
```

**EPG (XMLTV):**
```
https://xstream-server.fly.dev/xmltv.php?username=Emmgen2&password=gJWB28F
```

## Configurazione Client Popolari

### TiviMate

1. Apri TiviMate
2. Vai su **Settings** → **Playlists**
3. Aggiungi nuova playlist
4. Seleziona **Xtream Codes API**
5. Inserisci:
   - **Server**: `xstream-server.fly.dev`
   - **Username**: `Emmgen2`
   - **Password**: `gJWB28F`
6. Salva e aggiorna

### VLC Media Player

1. Apri VLC
2. Vai su **Media** → **Open Network Stream**
3. Inserisci:
   ```
   https://xstream-server.fly.dev/get.php?username=Emmgen2&password=gJWB28F&type=m3u
   ```
4. Clicca **Play**

### Kodi (IPTV Simple Client)

1. Installa addon **IPTV Simple Client**
2. Configurazione → **M3U Play List URL**:
   ```
   https://xstream-server.fly.dev/get.php?username=Emmgen2&password=gJWB28F&type=m3u
   ```
3. **EPG URL**:
   ```
   https://xstream-server.fly.dev/xmltv.php?username=Emmgen2&password=gJWB28F
   ```

### Smart TV (Samsung, LG, Android TV)

Usa un'app IPTV compatibile (es. **TiviMate**, **IPTV Smarters**) e configura con:
- **Server**: `xstream-server.fly.dev`
- **Username**: `Emmgen2`
- **Password**: `gJWB28F`

## Verifica Funzionamento

Prima di configurare il client, verifica che il server risponda:

```bash
# Health check
curl https://xstream-server.fly.dev/health

# Test API
curl "https://xstream-server.fly.dev/player_api.php?username=Emmgen2&password=gJWB28F"

# Test M3U
curl "https://xstream-server.fly.dev/get.php?username=Emmgen2&password=gJWB28F&type=m3u" | head -10
```

## Note Importanti

1. **HTTPS obbligatorio**: Il server usa HTTPS, assicurati che il client supporti certificati SSL
2. **Aggiornamento automatico**: I dati M3U vengono aggiornati automaticamente ogni 6 ore
3. **Multi-dispositivo**: Puoi usare le stesse credenziali su più dispositivi contemporaneamente
4. **Cache persistente**: I dati sono salvati su volume persistente, quindi rimangono anche dopo riavvii

## Troubleshooting

Se il client non si connette:

1. Verifica che l'app sia online:
   ```bash
   fly status --app xstream-server
   ```

2. Controlla i logs:
   ```bash
   fly logs --app xstream-server
   ```

3. Testa manualmente l'URL M3U nel browser

4. Verifica che username e password siano corretti (case-sensitive)

