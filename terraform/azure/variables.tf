variable "resource_group_name" {
  description = "Name der Ressourcengruppe"
  type        = string
  default     = "rg-zeemless-voice"
}

variable "location" {
  description = "Azure Region (z.B. westeurope oder germanywestcentral)"
  type        = string
  default     = "germanywestcentral"
}

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

variable "image_name" {
  description = "Docker Image (muss in einer zugänglichen Registry wie ACR oder Docker Hub liegen)"
  type        = string
  default     = "deine-registry.azurecr.io/zeemless-voice-agent:latest"
}
