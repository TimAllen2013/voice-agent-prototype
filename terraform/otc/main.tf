terraform {
  required_providers {
    opentelekomcloud = {
      source  = "opentelekomcloud/opentelekomcloud"
      version = ">= 1.35.0"
    }
  }
}

# ─── Provider Auth ─────────────────────────────────────────────
# Bewährtes Pattern: domain_name + tenant_name (NICHT domain_id!)
# WICHTIG: OS_CLOUD env var darf NICHT gesetzt sein, sonst
#          konfligiert clouds.yaml mit diesen Werten.
provider "opentelekomcloud" {
  auth_url    = "https://iam.eu-de.otc.t-systems.com/v3"
  user_name   = var.otc_username
  password    = var.otc_password
  domain_name = var.otc_domain_name
  tenant_name = "eu-de"
}

# ─── Netzwerk (VPC + Subnet) ──────────────────────────────────
resource "opentelekomcloud_vpc_v1" "vpc" {
  name = var.vpc_name
  cidr = "192.168.0.0/16"
  tags = var.tags
}

resource "opentelekomcloud_vpc_subnet_v1" "subnet" {
  name       = var.subnet_name
  cidr       = "192.168.1.0/24"
  gateway_ip = "192.168.1.1"
  vpc_id     = opentelekomcloud_vpc_v1.vpc.id
  dns_list   = ["100.125.4.25", "100.125.1.250", "8.8.8.8"]
  tags       = var.tags
}

# ─── Security Groups ──────────────────────────────────────────
# SG für App-Server: SSH + Web von außen
resource "opentelekomcloud_networking_secgroup_v2" "sg_app" {
  name        = "zl-sg-app"
  description = "Zeemless Labs App: Port 3000 (Web) + 22 (SSH) extern"
}

resource "opentelekomcloud_networking_secgroup_rule_v2" "rule_3000" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 3000
  port_range_max    = 3000
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = opentelekomcloud_networking_secgroup_v2.sg_app.id
}

resource "opentelekomcloud_networking_secgroup_rule_v2" "rule_22" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 22
  port_range_max    = 22
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = opentelekomcloud_networking_secgroup_v2.sg_app.id
}

# SG für Datenbank: PostgreSQL NUR aus dem internen Subnet
resource "opentelekomcloud_networking_secgroup_v2" "sg_db" {
  name        = "zl-sg-db"
  description = "Zeemless Labs DB: Port 5432 nur intern (192.168.1.0/24)"
}

resource "opentelekomcloud_networking_secgroup_rule_v2" "rule_pg" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 5432
  port_range_max    = 5432
  remote_ip_prefix  = "192.168.1.0/24"
  security_group_id = opentelekomcloud_networking_secgroup_v2.sg_db.id
}

# ─── RDS PostgreSQL (Managed) ─────────────────────────────────
resource "opentelekomcloud_rds_instance_v3" "postgres" {
  name              = "zl-rds-pg"
  flavor            = var.db_flavor   # rds.pg.x1.large.2 = 2vCPU, 4GB RAM
  availability_zone = [var.availability_zone]

  db {
    type     = "PostgreSQL"
    version  = "14"
    password = var.db_password
    port     = 5432
  }

  volume {
    type = "CLOUDSSD"
    size = var.db_volume_size
  }

  security_group_id = opentelekomcloud_networking_secgroup_v2.sg_db.id
  subnet_id         = opentelekomcloud_vpc_subnet_v1.subnet.network_id
  vpc_id            = opentelekomcloud_vpc_v1.vpc.id

  backup_strategy {
    start_time = "02:00-03:00"
    keep_days  = 7
  }

  tags = var.tags
}

# ─── SSH Keypair ───────────────────────────────────────────────
resource "opentelekomcloud_compute_keypair_v2" "my_keypair" {
  name       = "zl-keypair"
  public_key = file("C:/Users/tobia/.ssh/id_ed25519.pub")
}

# ─── Ubuntu Image ─────────────────────────────────────────────
data "opentelekomcloud_images_image_v2" "ubuntu" {
  name       = "Standard_Ubuntu_22.04_latest"
  visibility = "public"
}

# ─── Elastic IP ───────────────────────────────────────────────
resource "opentelekomcloud_vpc_eip_v1" "eip" {
  publicip {
    type = "5_bgp"
  }
  bandwidth {
    name        = "zl-bw"
    size        = 10
    share_type  = "PER"
    charge_mode = "traffic"
  }
  tags = var.tags
}

# ─── ECS App-Server (Docker Host) ─────────────────────────────
resource "opentelekomcloud_compute_instance_v2" "app" {
  name            = "zl-ecs-app"
  image_id        = data.opentelekomcloud_images_image_v2.ubuntu.id
  flavor_id       = var.flavor_id
  key_pair        = opentelekomcloud_compute_keypair_v2.my_keypair.name
  security_groups = [opentelekomcloud_networking_secgroup_v2.sg_app.name]
  tags            = var.tags

  network {
    uuid = opentelekomcloud_vpc_subnet_v1.subnet.id
  }

  # Boot-Script: Wartet auf Internet, installiert Docker,
  # klont das Repo und startet den Container mit DB-Verbindung.
  user_data = <<-EOF
              #!/bin/bash
              set -e
              exec > /var/log/user_data.log 2>&1

              echo "=== Warteschleife: Prüfe Internetverbindung ==="
              for i in $(seq 1 60); do
                if ping -c 1 -W 2 8.8.8.8 > /dev/null 2>&1; then
                  echo "Netzwerk verbunden nach $i Versuchen!"
                  break
                fi
                echo "Versuch $i/60: Warte auf Internet..."
                sleep 5
              done

              apt-get update -y
              apt-get install -y docker.io git postgresql-client
              systemctl start docker
              systemctl enable docker

              # Repository klonen
              git clone https://${var.github_pat}@github.com/TimAllen2013/voice-agent-prototype.git /opt/voice-agent
              cd /opt/voice-agent

              # Docker Image bauen
              docker build -t zl-voice .

              # Container starten MIT Datenbank-Verbindung
              docker run -d -p 3000:3000 \
                -e AZURE_OPENAI_API_KEY="${var.azure_openai_api_key}" \
                -e AZURE_OPENAI_ENDPOINT="${var.azure_openai_endpoint}" \
                -e AZURE_OPENAI_DEPLOYMENT_NAME="${var.azure_openai_deployment_name}" \
                -e AZURE_OPENAI_REALTIME_DEPLOYMENT="${var.azure_openai_realtime_deployment}" \
                -e DATABASE_URL="postgresql://root:${var.db_password}@${opentelekomcloud_rds_instance_v3.postgres.private_ips[0]}:5432/voiceagent" \
                -e AUTH_USERNAME="${var.auth_username}" \
                -e AUTH_PASSWORD="${var.auth_password}" \
                -e PORT=3000 \
                --restart always \
                --name zl-voice \
                zl-voice

              # Datenbank initialisieren
              echo "=== Erstelle voiceagent Datenbank ==="
              PGPASSWORD="${var.db_password}" psql \
                -h ${opentelekomcloud_rds_instance_v3.postgres.private_ips[0]} \
                -U root -d postgres \
                -c "CREATE DATABASE voiceagent;" || echo "DB existiert bereits"

              echo "=== Setup abgeschlossen ==="
              EOF
}

# ─── EIP an App-Server binden ─────────────────────────────────
resource "opentelekomcloud_networking_floatingip_associate_v2" "fip" {
  floating_ip = opentelekomcloud_vpc_eip_v1.eip.publicip[0].ip_address
  port_id     = opentelekomcloud_compute_instance_v2.app.network[0].port
}
