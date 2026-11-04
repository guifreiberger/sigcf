# Lidos pelo infra/app (terraform_remote_state) e usados para configurar o GitHub Actions.

output "grupo_de_recursos" {
  value = azurerm_resource_group.sigcf.name
}

output "regiao" {
  value = azurerm_resource_group.sigcf.location
}

output "ambiente_containers_id" {
  value = azurerm_container_app_environment.ambiente.id
}

output "registry" {
  value = azurerm_container_registry.imagens.login_server
}

output "registry_nome" {
  value = azurerm_container_registry.imagens.name
}

output "identidade_aplicacao_id" {
  value = azurerm_user_assigned_identity.aplicacao.id
}

output "identidade_implantacao_client_id" {
  value = azurerm_user_assigned_identity.implantacao.client_id
}

output "tenant_id" {
  value = data.azurerm_client_config.atual.tenant_id
}

output "assinatura_id" {
  value = data.azurerm_client_config.atual.subscription_id
}

output "mysql_servidor" {
  value = azurerm_mysql_flexible_server.banco.fqdn
}

output "mysql_usuario" {
  value = azurerm_mysql_flexible_server.banco.administrator_login
}

output "mysql_senha" {
  value     = random_password.mysql.result
  sensitive = true
}

output "bancos" {
  value = { for ambiente, banco in azurerm_mysql_flexible_database.bancos : ambiente => banco.name }
}

output "application_insights_id" {
  value = azurerm_application_insights.monitoramento.id
}

output "grupo_de_alertas_id" {
  value = azurerm_monitor_action_group.alertas.id
}
