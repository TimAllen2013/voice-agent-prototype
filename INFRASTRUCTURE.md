# ZEEMLESS Platform — Infrastruktur, Architektur & Deployment-Standards

> **Stand:** 24. März 2026
> **Maintainer:** tobias.meilke@greybee.de
> **OTC Domain:** OTC00000000001000171973
> **Azure Subscription:** cd0236bd-33a7-49d2-b677-0183de0619b5

---

## 1. Architektur-Übersicht

```
                        ┌─────────────────────────────────────────────┐
                        │           INTERNET                          │
                        └────────────────┬────────────────────────────┘
                                         │
                              EIP: 164.30.13.130
                              ┌──────────┴──────────┐
                              │   OTC ECS Server     │
                              │   zl-ecs-app         │
                              │   Ubuntu 22.04       │
                              │   s3.medium.2        │
                              │   (2 vCPU, 4GB RAM)  │
                              │                      │
                              │  ┌──────────────┐    │
                              │  │ Docker        │    │
                              │  │               │    │
                              │  │ :3000 (HTTP)  │────┼──── Browser (Text-Chat)
                              │  │ :3443 (HTTPS) │────┼──── Browser (Voice/WebRTC)
                              │  │               │    │
                              │  │ Node.js 20    │    │
                              │  │ Express.js    │    │
                              │  └──────┬───────┘    │
                              │         │             │
                              └─────────┼─────────────┘
                                        │ :5432 (intern)
                              ┌─────────┴─────────────┐
                              │   OTC RDS PostgreSQL   │
                              │   zl-rds-pg            │
                              │   PostgreSQL 14        │
                              │   192.168.1.96         │
                              │   rds.pg.x1.large.2    │
                              │   (2 vCPU, 4GB, 40GB)  │
                              └────────────────────────┘

    ECS ──► Azure OpenAI (zeemlessartint.openai.azure.com)
            ├── Chat:     gpt-4o, gpt-4.1, gpt-5-chat, o3-mini, o4-mini
            ├── Realtime: gpt-realtime-1.5 (Voice/WebRTC)
            ├── Bild:     dall-e-3
            └── Embedding: text-embedding-3-large, ada-002
```

---

## 2. Netzwerk

| Ressource | Wert |
|-----------|------|
| **VPC** | zl-vpc, CIDR 192.168.0.0/16 |
| **Subnet** | zl-subnet, CIDR 192.168.1.0/24, GW 192.168.1.1 |
| **DNS** | 100.125.4.25, 100.125.1.250, 8.8.8.8 |
| **EIP** | 164.30.13.130 (5_bgp, 10 Mbps, traffic-basiert) |

### Security Groups

| SG | Port | Protokoll | Quelle | Zweck |
|----|------|-----------|--------|-------|
| zl-sg-app | 22 | TCP | 0.0.0.0/0 | SSH |
| zl-sg-app | 3000 | TCP | 0.0.0.0/0 | HTTP (App) |
| zl-sg-app | 3443 | TCP | 0.0.0.0/0 | HTTPS (WebRTC) |
| zl-sg-db | 5432 | TCP | 192.168.1.0/24 | PostgreSQL (nur intern) |

---

## 3. Standards für neue Projekte

### 3.1 HTTPS (Pflicht)

Jede Web-App MUSS HTTPS unterstützen. WebRTC (`getUserMedia`) erfordert einen Secure Context.

```bash
# Self-signed Zertifikat generieren (auf dem Server)
openssl req -x509 -newkey rsa:2048 \
  -keyout /opt/ssl/server-key.pem \
  -out /opt/ssl/server.pem \
  -days 365 -nodes -subj "/CN=164.30.13.130"
```

**Node.js Pattern:**
```javascript
const https = require('https');
const fs = require('fs');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    https.createServer({
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath)
    }, app).listen(HTTPS_PORT);
}
```

### 3.2 Basic Auth (Pflicht)

Jede öffentliche App MUSS hinter Basic Auth stehen. Kein offener Zugang.

```javascript
app.use((req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Basic ')) {
        res.set('WWW-Authenticate', 'Basic realm="ZEEMLESS"');
        return res.status(401).send('Authentifizierung erforderlich');
    }
    const [user, pass] = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
    if (user === process.env.AUTH_USERNAME && pass === process.env.AUTH_PASSWORD) return next();
    res.set('WWW-Authenticate', 'Basic realm="ZEEMLESS"');
    res.status(401).send('Ungültige Zugangsdaten');
});
```

### 3.3 LLM-Endpunkte (Standard)

Alle Projekte nutzen dieselbe Azure OpenAI Ressource: **zeemlessArtInt** (swedencentral).

| Anwendungsfall | Deployment | Modell | Empfehlung |
|---------------|------------|--------|------------|
| **Chat (Standard)** | gpt-4o | gpt-4o | Beste Balance Qualität/Preis |
| **Chat (günstig)** | gpt-5-mini | gpt-5-mini | 8x günstiger als gpt-4o |
| **Chat (schnell)** | zeemlessPlayground | gpt-4.1-mini | Niedrigste Latenz |
| **Reasoning** | o3-mini | o3-mini | Für komplexe Logik |
| **Code** | o1-mini | o4-mini | Code-Generierung |
| **Voice/Realtime** | gpt-realtime-15 | gpt-realtime-1.5 | WebRTC, einziges aktives |
| **Bilder** | Dalle3 | dall-e-3 | Bilderzeugung |
| **Embedding** | text-embedding-3-large | text-embedding-3-large | RAG, Semantic Search |
| **Embedding (günstig)** | text-embedding-ada-002 | text-embedding-ada-002 | Legacy, günstig |

**API-Key:** Wird als `AZURE_OPENAI_API_KEY` Environment-Variable übergeben, NIEMALS im Code.

### 3.4 Datenbank (Shared RDS)

Alle Projekte teilen sich die RDS-Instanz `zl-rds-pg` (192.168.1.96:5432).

**Konvention:** Jedes Projekt bekommt eine eigene Datenbank:
```
postgresql://root:<PASSWORT>@192.168.1.96:5432/<projektname>
```

| Projekt | Datenbank |
|---------|-----------|
| Voice Agent | voiceagent |
| (Neues Projekt) | `<projektname>` — via `CREATE DATABASE <name>;` anlegen |

### 3.5 Docker (Standard)

```dockerfile
FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000 3443
CMD ["node", "server.js"]
```

**Container-Namenskonvention:** `zl-<projekt>` (z.B. `zl-voice`, `zl-dashboard`)

### 3.6 Port-Konvention

| Projekt | HTTP | HTTPS |
|---------|------|-------|
| Voice Agent | 3000 | 3443 |
| (Nächstes) | 3001 | 3444 |
| (Weiteres) | 3002 | 3445 |

Ports in Security Group `zl-sg-app` öffnen (Terraform oder manuell).

---

## 4. Neues Projekt deployen (Schritt-für-Schritt)

### 4.1 Lokal entwickeln

```bash
# 1. Repo klonen
git clone https://github.com/<org>/<projekt>.git
cd <projekt>

# 2. .env aus .env.example erstellen
cp .env.example .env
# → API Keys, DB-URL, Auth-Credentials eintragen

# 3. Lokal starten
npm install
npm start
# → http://localhost:3000
```

### 4.2 Auf OTC deployen

```bash
# SSH auf den Server
ssh -i ~/.ssh/id_ed25519 ubuntu@164.30.13.130

# Repo klonen
sudo git clone https://<GITHUB_PAT>@github.com/<org>/<projekt>.git /opt/<projekt>
cd /opt/<projekt>

# Docker Image bauen
sudo docker build -t zl-<projekt> .

# Datenbank erstellen (einmalig)
PGPASSWORD="<DB_PASS>" psql -h 192.168.1.96 -U root -d postgres \
  -c "CREATE DATABASE <projektname>;"

# Container starten
sudo docker run -d \
  -p <HTTP_PORT>:<HTTP_PORT> \
  -p <HTTPS_PORT>:<HTTPS_PORT> \
  -v /opt/ssl:/etc/ssl/private:ro \
  -e AZURE_OPENAI_API_KEY="<KEY>" \
  -e AZURE_OPENAI_ENDPOINT="https://zeemlessartint.openai.azure.com/" \
  -e AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o" \
  -e DATABASE_URL="postgresql://root:<PASS>@192.168.1.96:5432/<projektname>" \
  -e AUTH_USERNAME="admin" \
  -e AUTH_PASSWORD="<PASSWORT>" \
  -e PORT=<HTTP_PORT> \
  -e HTTPS_PORT=<HTTPS_PORT> \
  -e TLS_CERT=/etc/ssl/private/server.pem \
  -e TLS_KEY=/etc/ssl/private/server-key.pem \
  --restart always \
  --name zl-<projekt> \
  zl-<projekt>
```

### 4.3 Security Group Port öffnen (Terraform)

In `terraform/otc/main.tf` neue Rule hinzufügen:
```hcl
resource "opentelekomcloud_networking_secgroup_rule_v2" "rule_<PORT>" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = <PORT>
  port_range_max    = <PORT>
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = opentelekomcloud_networking_secgroup_v2.sg_app.id
}
```

```bash
cd terraform/otc
terraform apply -target=opentelekomcloud_networking_secgroup_rule_v2.rule_<PORT>
```

---

## 5. Terraform-Verwaltung

### State importieren (bestehende Infrastruktur)

```bash
cd terraform/otc
terraform init
terraform import opentelekomcloud_vpc_v1.vpc <VPC_ID>
terraform import opentelekomcloud_vpc_subnet_v1.subnet <SUBNET_ID>
# ... (siehe HANDOVER.md für alle IDs)
terraform plan   # Prüfen: RDS darf NICHT replaced werden!
terraform apply
```

### Aktuelle Ressourcen-IDs

| Ressource | ID |
|-----------|---|
| VPC | a5b63157-a607-4dab-b0d8-d4ff34c4dfff |
| Subnet | 99915078-9093-47db-aa61-b887241a6182 |
| SG App | b5f3590d-e3d3-44f5-951c-cecb5176a393 |
| SG DB | 44c9e5b6-2108-4c9c-9773-1e130846d0a3 |
| RDS | 8562206a8e054d5b93b73c4567ebc511in03 |
| ECS | b472f22d-fcdc-40dd-a433-f0dc2183ac60 |
| EIP | 0af1f445-cbe5-49b0-8653-333e63b919b3 |
| Keypair | zl-keypair |

---

## 6. Server-Zugang & Wartung

```bash
# SSH
ssh -i ~/.ssh/id_ed25519 ubuntu@164.30.13.130

# Alle Container anzeigen
sudo docker ps -a

# Logs eines Containers
sudo docker logs -f zl-voice

# Container neu starten
sudo docker restart zl-voice

# Code updaten + Container neu bauen
cd /opt/voice-agent
sudo git pull
sudo docker build -t zl-voice .
sudo docker rm -f zl-voice
# → docker run ... (siehe Abschnitt 4.2)

# Datenbank-Zugang (vom ECS Server)
PGPASSWORD="<PASS>" psql -h 192.168.1.96 -U root -d voiceagent
```

---

## 7. Azure OpenAI Ressourcen

| Ressource | Resource Group | Region | Endpoint |
|-----------|---------------|--------|----------|
| **zeemlessArtInt** | zeemlessBTC | swedencentral | https://zeemlessartint.openai.azure.com/ |
| openai-zeemless-dev | rg-zeemless-ai-dev | westeurope | https://westeurope.api.cognitive.microsoft.com/ |
| openaisearchservice91212 | Ai-playground-grp | swedencentral | https://openaisearchservice91212.openai.azure.com/ |

**Standard-Ressource:** `zeemlessArtInt` — alle Projekte nutzen diese.

### Neues Deployment erstellen

```bash
az cognitiveservices account deployment create \
  --name zeemlessArtInt \
  --resource-group zeemlessBTC \
  --deployment-name <DEPLOYMENT_NAME> \
  --model-name <MODEL_NAME> \
  --model-version "<VERSION>" \
  --model-format OpenAI \
  --sku-capacity <CAPACITY> \
  --sku-name GlobalStandard
```

### API-Key auslesen

```bash
az cognitiveservices account keys list \
  --name zeemlessArtInt \
  --resource-group zeemlessBTC \
  --query "key1" -o tsv
```

---

## 8. Sicherheits-Checkliste

- [x] HTTPS auf allen Web-Apps (Self-signed TLS, Port 3443)
- [x] Basic Auth auf allen öffentlichen Endpunkten
- [x] API-Keys nur als Environment-Variablen, nie im Code
- [x] `.env` und `terraform.tfvars` in `.gitignore`
- [x] PostgreSQL nur intern erreichbar (192.168.1.0/24)
- [x] SSH nur mit ED25519-Key, kein Passwort-Login
- [x] Docker Container mit `--restart always`
- [x] RDS mit `lifecycle { prevent_destroy = true }` in Terraform
- [x] Tägliche DB-Backups (02:00-03:00, 7 Tage)
