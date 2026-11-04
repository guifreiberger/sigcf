output "url" {
  description = "Endereço público do ambiente."
  value       = "https://${azurerm_container_app.sigcf.ingress[0].fqdn}"
}

output "revisao" {
  description = "Revisão ativa do app; o Container Apps guarda as anteriores para rollback."
  value       = azurerm_container_app.sigcf.latest_revision_name
}
