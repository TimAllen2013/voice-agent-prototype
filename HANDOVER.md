# ZEEMLESS Voice Agent — Handover & Open Tasks

> **Stand:** 23. März 2026, 14:30 Uhr
> **Repo:** https://github.com/TimAllen2013/voice-agent-prototype
> **Branch:** `main` (Commit `f066289`)

---

## 🟢 Was funktioniert

| Komponente | Status | Details |
|-----------|--------|---------|
| **OTC Infrastruktur** | ✅ Deployed | VPC, Subnet, Security Groups, ECS, RDS, EIP via Terraform |
| **ECS App-Server** | ✅ Läuft | `164.30.13.130:3000` — Docker Container `zl-voice` |
| **RDS PostgreSQL** | ✅ Läuft | `192.168.1.96:5432`, DB `voiceagent`, User `root` |
| **Frontend (start.html)** | ✅ Erreichbar | Mandanten-Übersicht mit "Manuell erfassen" + "Voice Agent" Buttons |
| **Frontend (index.html)** | ✅ Erreichbar | Voice Agent UI mit Chat Panel + Parameter Live-View |
| **GitHub Repo** | ✅ Aktuell | Alles gepusht, `terraform.tfvars` in `.gitignore` |

---

## 🔴 Offene Aufgabe: Azure OpenAI Endpunkt

### Problem
Der Azure OpenAI Endpoint `openai-zeemless-dev.openai.azure.com` existiert **nicht als DNS-Record**.
- Realtime Token Endpoint `/api/realtime/token` → `ENOTFOUND`
- Chat Endpoint `/api/chat` → `ENOTFOUND`
- **Voice Agent funktioniert daher nicht** (nur statisches Frontend)

### Lösung: Azure OpenAI Resource erstellen

**Schritt 1 — Azure Login:**
```bash
az login
```

**Schritt 2 — Resource Group erstellen (falls keine vorhanden):**
```bash
az group create --name rg-zeemless-dev --location swedencentral
```

**Schritt 3 — Azure OpenAI Resource erstellen:**
```bash
az cognitiveservices account create \
  --name openai-zeemless-dev \
  --resource-group rg-zeemless-dev \
  --kind OpenAI \
  --sku S0 \
  --location swedencentral \
  --custom-domain openai-zeemless-dev
```
> ⚠️ `swedencentral` unterstützt gpt-4o + Realtime. Alternativ: `eastus2`, `westus3`

**Schritt 4 — gpt-4o Deployment erstellen:**
```bash
az cognitiveservices account deployment create \
  --name openai-zeemless-dev \
  --resource-group rg-zeemless-dev \
  --deployment-name gpt-4o \
  --model-name gpt-4o \
  --model-version "2024-08-06" \
  --model-format OpenAI \
  --sku-capacity 10 \
  --sku-name Standard
```

**Schritt 5 — gpt-4o-realtime Deployment erstellen:**
```bash
az cognitiveservices account deployment create \
  --name openai-zeemless-dev \
  --resource-group rg-zeemless-dev \
  --deployment-name gpt-realtime-15 \
  --model-name gpt-4o-realtime-preview \
  --model-version "2024-12-17" \
  --model-format OpenAI \
  --sku-capacity 1 \
  --sku-name GlobalStandard
```

**Schritt 6 — Endpoint + Key auslesen:**
```bash
# Endpoint
az cognitiveservices account show \
  --name openai-zeemless-dev \
  --resource-group rg-zeemless-dev \
  --query "properties.endpoint" -o tsv

# API Key
az cognitiveservices account keys list \
  --name openai-zeemless-dev \
  --resource-group rg-zeemless-dev \
  --query "key1" -o tsv
```

**Schritt 7 — OTC Container updaten:**
```bash
# SSH auf den ECS Server
ssh -i ~/.ssh/id_ed25519 ubuntu@164.30.13.130

# Container mit korrektem Endpoint neu starten
sudo docker rm -f zl-voice
sudo docker run -d -p 3000:3000 --dns 8.8.8.8 --dns 8.8.4.4 \
  -e AZURE_OPENAI_API_KEY="<NEUER_KEY>" \
  -e AZURE_OPENAI_ENDPOINT="https://openai-zeemless-dev.openai.azure.com/" \
  -e AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o" \
  -e AZURE_OPENAI_REALTIME_DEPLOYMENT="gpt-realtime-15" \
  -e AUTH_USERNAME="admin" \
  -e AUTH_PASSWORD="prototype2026" \
  -e PORT=3000 \
  --restart always \
  --name zl-voice \
  zl-voice
```

**Schritt 8 — Verifizieren:**
```bash
# Token-Endpoint testen
curl http://164.30.13.130:3000/api/realtime/token

# Erwartete Antwort: JSON mit token, endpoint, deployment, expiresAt
```

---

## 📁 Projekt-Struktur

```
voice-agent-prototype/
├── server.js              # Express Backend (REST API calls zu Azure)
├── start.html             # Mandanten-Übersicht (Landing Page)
├── index.html             # Voice Agent UI
├── package.json           # Dependencies (ohne @azure/openai!)
├── Dockerfile             # Node.js 20 Container
├── docker-compose.yml     # Lokale Entwicklung mit PostgreSQL
├── .gitignore             # terraform.tfvars + secrets ausgeschlossen
└── terraform/otc/
    ├── main.tf            # OTC Infrastruktur (VPC, ECS, RDS, EIP)
    ├── variables.tf       # Variablen-Definitionen
    ├── outputs.tf         # Output-Definitionen
    └── terraform.tfvars   # ⚠️ NICHT in Git! Secrets! (siehe unten)
```

---

## 🔑 Credentials (terraform.tfvars — NICHT in Git)

Diese Datei muss auf dem neuen Rechner manuell erstellt werden unter
`voice-agent-prototype/terraform/otc/terraform.tfvars`:

```hcl
# ─── OTC Credentials ─────────────────────────────────────────
otc_username    = "<OTC_USERNAME>"
otc_password    = "<OTC_PASSWORD>"
otc_domain_name = "<OTC_DOMAIN_NAME>"

# ─── Azure OpenAI ────────────────────────────────────────────
azure_openai_api_key             = "<NACH AZURE SETUP EINTRAGEN>"
azure_openai_endpoint            = "https://openai-zeemless-dev.openai.azure.com/"
azure_openai_deployment_name     = "gpt-4o"
azure_openai_realtime_deployment = "gpt-realtime-15"

# ─── GitHub ──────────────────────────────────────────────────
github_pat = "<GITHUB_PAT>"

# ─── App Auth ────────────────────────────────────────────────
auth_username = "admin"
auth_password = "<APP_PASSWORD>"

# ─── Datenbank ───────────────────────────────────────────────
db_password = "<DB_PASSWORD>"
```

---

## 🖥️ Server-Zugang

```bash
# SSH (Key muss auf neuem Rechner vorhanden sein)
ssh -i ~/.ssh/id_ed25519 ubuntu@164.30.13.130

# Docker Logs prüfen
sudo docker logs -f zl-voice

# Container neu starten
sudo docker restart zl-voice

# Code updaten + Container neu bauen
cd /opt/voice-agent
sudo git pull
sudo docker build -t zl-voice .
sudo docker rm -f zl-voice
# Dann docker run wie oben in Schritt 7
```

---

## ⚡ Quick-Start auf neuem Rechner

```bash
# 1. Repo klonen
git clone https://github.com/TimAllen2013/voice-agent-prototype.git
cd voice-agent-prototype

# 2. terraform.tfvars anlegen (siehe oben)

# 3. Lokal entwickeln
npm install
cp .env.example .env  # Falls vorhanden, sonst .env manuell anlegen
npm start

# 4. Terraform (nur wenn Infrastruktur-Änderungen nötig)
cd terraform/otc
terraform init
terraform plan
terraform apply
```

---

## 🏗️ Architektur-Übersicht

```
┌─────────────────┐     :3000      ┌──────────────────┐
│  👤 Browser     │──────────────▶│  ECS (zl-ecs-app) │
│  (WebRTC/Voice) │   EIP         │  Docker: zl-voice │
└─────────────────┘  164.30.13.130│  Node.js Express  │
                                   └────────┬─────────┘
                                            │ :5432 intern
                                   ┌────────▼─────────┐
                                   │  RDS (zl-rds-pg)  │
                                   │  PostgreSQL 16    │
                                   │  192.168.1.96     │
                                   └──────────────────┘

ECS ──▶ Azure OpenAI (Realtime + Chat API)
        ⚠️ Endpoint muss erst erstellt werden!
```
