# ─── OTC Authentifizierung ────────────────────────────────────
variable "otc_username" {
  description = "OTC IAM Benutzername"
  type        = string
}

variable "otc_password" {
  description = "OTC IAM Passwort"
  type        = string
  sensitive   = true
}

variable "otc_domain_name" {
  description = "OTC Domain Name (z.B. OTC00000000001000171973)"
  type        = string
}

# ─── Azure OpenAI ─────────────────────────────────────────────
variable "azure_openai_api_key" {
  description = "API Key für Azure OpenAI"
  type        = string
  sensitive   = true
}

variable "azure_openai_endpoint" {
  description = "Endpoint für Azure OpenAI"
  type        = string
}

variable "azure_openai_deployment_name" {
  description = "Deployment-Name für das Azure OpenAI Modell"
  type        = string
}

variable "azure_openai_realtime_deployment" {
  description = "Deployment-Name für das Azure OpenAI Realtime Modell"
  type        = string
  default     = "gpt-realtime-15"
}

# ─── App Auth ─────────────────────────────────────────────────
variable "auth_username" {
  description = "Basic Auth Benutzername"
  type        = string
  default     = "admin"
}

variable "auth_password" {
  description = "Basic Auth Passwort"
  type        = string
  sensitive   = true
  default     = "prototype2026"
}

variable "github_pat" {
  description = "GitHub Personal Access Token für Repository-Zugriff"
  type        = string
  sensitive   = true
}

# ─── Infrastruktur ────────────────────────────────────────────
variable "vpc_name" {
  description = "Name der VPC"
  type        = string
  default     = "zl-vpc"
}

variable "subnet_name" {
  description = "Name des Subnets"
  type        = string
  default     = "zl-subnet"
}

variable "flavor_id" {
  description = "ECS Flavor für den App-Server"
  type        = string
  default     = "s3.medium.2"
}

variable "availability_zone" {
  description = "OTC Availability Zone"
  type        = string
  default     = "eu-de-01"
}

# ─── Datenbank ────────────────────────────────────────────────
variable "db_password" {
  description = "PostgreSQL root Passwort (min. 8 Zeichen, Groß/Klein/Zahl/Sonderzeichen)"
  type        = string
  sensitive   = true
}

variable "db_flavor" {
  description = "RDS Flavor für PostgreSQL (2 vCPU, 4GB RAM)"
  type        = string
  default     = "rds.pg.x1.large.2"
}

variable "db_volume_size" {
  description = "Größe der Datenbank-Festplatte in GB"
  type        = number
  default     = 40
}

# ─── Tags für Kostentrennung ──────────────────────────────────
variable "tags" {
  description = "Tags für die getrennte Abrechnung in der OTC"
  type        = map(string)
  default = {
    Project     = "ZeemlessLabs-VoiceAgent"
    Environment = "Dev"
    CostCenter  = "ZeemlessLabs"
  }
}
