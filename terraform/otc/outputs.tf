# ─── Öffentliche URL der App ──────────────────────────────────
output "app_url" {
  value       = "http://${opentelekomcloud_vpc_eip_v1.eip.publicip[0].ip_address}:3000"
  description = "Öffentliche URL des Voice Agent"
}

# ─── SSH-Befehl ───────────────────────────────────────────────
output "ssh_command" {
  value       = "ssh ubuntu@${opentelekomcloud_vpc_eip_v1.eip.publicip[0].ip_address}"
  description = "SSH-Befehl zum Verbinden mit dem App-Server"
}

# ─── Datenbank-Host (intern) ─────────────────────────────────
output "db_host" {
  value       = opentelekomcloud_rds_instance_v3.postgres.private_ips[0]
  description = "Interne IP-Adresse der PostgreSQL-Datenbank (nur aus VPC erreichbar)"
}

# ─── Database URL ─────────────────────────────────────────────
output "database_url" {
  value       = "postgresql://root:****@${opentelekomcloud_rds_instance_v3.postgres.private_ips[0]}:5432/voiceagent"
  description = "Connection String (Passwort maskiert)"
}

# ─── App Server Private IP ────────────────────────────────────
output "app_private_ip" {
  value       = opentelekomcloud_compute_instance_v2.app.access_ip_v4
  description = "Private IP des App-Servers im Subnet"
}
