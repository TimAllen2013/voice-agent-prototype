terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}

# Log Analytics Workspace required for Container Apps
resource "azurerm_log_analytics_workspace" "law" {
  name                = "law-zeemless-voice"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "PerGB2018"
}

# Container App Environment
resource "azurerm_container_app_environment" "env" {
  name                       = "cae-zeemless-voice"
  location                   = azurerm_resource_group.rg.location
  resource_group_name        = azurerm_resource_group.rg.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.law.id
}

# Container App
resource "azurerm_container_app" "app" {
  name                         = "ca-zeemless-voice"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  template {
    container {
      name   = "zeemless-voice-agent"
      image  = var.image_name
      cpu    = 0.5
      memory = "1Gi"

      # Umgebungsvariablen für den Docker Container injizieren
      env {
        name  = "PORT"
        value = "3000"
      }
      env {
        name  = "AZURE_OPENAI_ENDPOINT"
        value = var.azure_openai_endpoint
      }
      env {
        name  = "AZURE_OPENAI_DEPLOYMENT_NAME"
        value = var.azure_openai_deployment_name
      }
      # Das Secret wird sicher referenziert
      env {
        name        = "AZURE_OPENAI_API_KEY"
        secret_name = "azure-openai-api-key"
      }
    }
  }

  secret {
    name  = "azure-openai-api-key"
    value = var.azure_openai_api_key
  }

  ingress {
    allow_insecure_connections = false
    external_enabled           = true
    target_port                = 3000
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }
}

output "app_url" {
  value       = "https://${azurerm_container_app.app.latest_revision_fqdn}"
  description = "Die öffentliche URL des Azure Container Apps"
}
