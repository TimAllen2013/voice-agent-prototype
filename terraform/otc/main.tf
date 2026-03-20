terraform {
  required_providers {
    opentelekomcloud = {
      source  = "opentelekomcloud/opentelekomcloud"
      version = ">= 1.35.0"
    }
  }
}

provider "opentelekomcloud" {
  # Authentifizierung erfolgt am besten über die "source openrc.sh" Methode der OTC
  # Variablen: OS_AUTH_URL, OS_PROJECT_NAME, OS_USERNAME, OS_PASSWORD, OS_DOMAIN_NAME
}

# Network (VPC)
resource "opentelekomcloud_vpc_v1" "vpc" {
  name = var.vpc_name
  cidr = "192.168.0.0/16"
}

# Subnet
resource "opentelekomcloud_vpc_subnet_v1" "subnet" {
  name       = var.subnet_name
  cidr       = "192.168.1.0/24"
  gateway_ip = "192.168.1.1"
  vpc_id     = opentelekomcloud_vpc_v1.vpc.id
}

# Security Group
resource "opentelekomcloud_networking_secgroup_v2" "sg" {
  name        = "sg-zeemless-voice"
  description = "Allow Port 3000 (Web) and 22 (SSH)"
}

# Eingehende Regel: Port 3000 öffnen
resource "opentelekomcloud_networking_secgroup_rule_v2" "rule_3000" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 3000
  port_range_max    = 3000
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = opentelekomcloud_networking_secgroup_v2.sg.id
}

# Eingehende Regel: Port 22 (SSH) öffnen
resource "opentelekomcloud_networking_secgroup_rule_v2" "rule_22" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 22
  port_range_max    = 22
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = opentelekomcloud_networking_secgroup_v2.sg.id
}

# Standard Ubuntu 22.04 Image suchen
data "opentelekomcloud_images_image_v2" "ubuntu" {
  name       = "Standard_Ubuntu_22.04_latest"
  visibility = "public"
}

# Elastic IP (EIP) für externen Zugriff reservieren
resource "opentelekomcloud_vpc_eip_v1" "eip" {
  publicip {
    type = "5_bgp"
  }
  bandwidth {
    name        = "bw-zeemless-voice"
    size        = 10 # Mbps
    share_type  = "PER"
    charge_mode = "traffic"
  }
}

# ECS (Elastic Cloud Server) VM bereitstellen
resource "opentelekomcloud_compute_instance_v2" "instance" {
  name              = "ecs-zeemless-voice"
  image_id          = data.opentelekomcloud_images_image_v2.ubuntu.id
  flavor_id         = var.flavor_id
  security_groups   = [opentelekomcloud_networking_secgroup_v2.sg.name]
  
  network {
    uuid = opentelekomcloud_vpc_subnet_v1.subnet.id
  }

  # user_data Script wird beim ersten Start ausgeführt:
  # Installiert Docker und startet unmittelbar das Container-Image.
  # Azure OpenAI Credentials werden als Umgebungsvariable ins Docker Deployment injiziert.
  user_data = <<-EOF
              #!/bin/bash
              apt-get update
              apt-get install -y docker.io unzip git
              systemctl start docker
              systemctl enable docker
              
              docker run -d -p 3000:3000 \
                -e AZURE_OPENAI_API_KEY="${var.azure_openai_api_key}" \
                -e AZURE_OPENAI_ENDPOINT="${var.azure_openai_endpoint}" \
                -e AZURE_OPENAI_DEPLOYMENT_NAME="${var.azure_openai_deployment_name}" \
                -e PORT=3000 \
                --restart always \
                --name zeemless-voice \
                ${var.image_name}
              EOF
}

# EIP an die Instanz binden
resource "opentelekomcloud_compute_floatingip_associate_v2" "fip" {
  floating_ip = opentelekomcloud_vpc_eip_v1.eip.publicip[0].ip_address
  instance_id = opentelekomcloud_compute_instance_v2.instance.id
}

# Ausgabe der URL
output "instance_url" {
  value       = "http://${opentelekomcloud_vpc_eip_v1.eip.publicip[0].ip_address}:3000"
  description = "Die öffentliche URL des Voice Agents in der OTC"
}
