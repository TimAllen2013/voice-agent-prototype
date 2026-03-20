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

variable "vpc_name" {
  description = "Name der bereitzustellenden VPC in der OTC"
  type        = string
  default     = "vpc-zeemless-voice"
}

variable "subnet_name" {
  description = "Name des bereitzustellenden Subnets in der OTC"
  type        = string
  default     = "subnet-zeemless-voice"
}

variable "flavor_id" {
  description = "ECS Flavor (Instanztyp) für den Docker-Host in der OTC"
  type        = string
  default     = "s3.large.2" 
}

variable "image_name" {
  description = "Docker Image, das auf der ECS gestartet werden soll"
  type        = string
  default     = "deine-registry/zeemless-voice-agent:latest"
}
