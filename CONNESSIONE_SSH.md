# Come Connettersi alla VM Oracle Cloud

Hai la chiave SSH `ssh-key-2025-11-23.key` nella directory del progetto.

## Connessione Manuale

Per connetterti manualmente alla VM Oracle Cloud:

```bash
ssh -i ssh-key-2025-11-23.key opc@84.8.248.50
```

**Nota**: Su Oracle Cloud l'utente predefinito è `opc`, non `root`.

## Se la connessione non funziona

1. **Verifica i permessi della chiave**:
   ```bash
   chmod 600 ssh-key-2025-11-23.key
   ```

2. **Verifica le Security Rules su Oracle Cloud Console**:
   - Vai su Networking → Virtual Cloud Networks
   - Seleziona la tua VCN → Security Lists → Default Security List
   - Assicurati che ci sia una regola per SSH (porta 22 TCP) da `0.0.0.0/0`

3. **Prova con verbose per vedere gli errori**:
   ```bash
   ssh -v -i ssh-key-2025-11-23.key opc@84.8.248.50
   ```

## Deploy Automatico

Usa lo script `deploy-remote.sh` che:
- Si connette automaticamente usando la chiave
- Carica tutti i file necessari
- Esegue il deploy sulla VM

```bash
./deploy-remote.sh
```

## Dopo la connessione

Una volta connesso, puoi:

1. **Caricare i file manualmente** (se preferisci):
   ```bash
   # Dal tuo computer locale
   scp -i ssh-key-2025-11-23.key -r . opc@84.8.248.50:~/xstream-server/
   ```

2. **Eseguire il deploy manualmente**:
   ```bash
   # Sulla VM
   cd ~/xstream-server
   ./deploy.sh
   ```

## Comandi Utili

### Controllare lo stato del container
```bash
ssh -i ssh-key-2025-11-23.key opc@84.8.248.50 'cd ~/xstream-server && docker-compose ps'
```

### Vedere i log
```bash
ssh -i ssh-key-2025-11-23.key opc@84.8.248.50 'cd ~/xstream-server && docker-compose logs -f'
```

### Riavviare il container
```bash
ssh -i ssh-key-2025-11-23.key opc@84.8.248.50 'cd ~/xstream-server && docker-compose restart'
```

### Fermare il container
```bash
ssh -i ssh-key-2025-11-23.key opc@84.8.248.50 'cd ~/xstream-server && docker-compose down'
```

