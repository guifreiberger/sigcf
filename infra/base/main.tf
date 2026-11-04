# Recursos compartilhados pelos ambientes de homologação e produção.

data "azurerm_client_config" "atual" {}

data "azurerm_storage_account" "estado" {
  name                = var.conta_estado
  resource_group_name = var.grupo_estado
}

# Nomes de banco e registry precisam ser únicos no Azure inteiro.
resource "random_string" "sufixo" {
  length  = 6
  upper   = false
  special = false
}

locals {
  tags = {
    projeto        = "sigcf"
    gerenciado_por = "terraform"
  }
}

resource "azurerm_resource_group" "sigcf" {
  name     = "rg-sigcf"
  location = var.regiao
  tags     = local.tags
}

# --- Observabilidade ---------------------------------------------------------

resource "azurerm_log_analytics_workspace" "logs" {
  name                = "log-sigcf"
  location            = azurerm_resource_group.sigcf.location
  resource_group_name = azurerm_resource_group.sigcf.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  # Teto diário de ingestão, para os logs nunca consumirem o crédito por engano.
  daily_quota_gb = 0.5
  tags           = local.tags
}

resource "azurerm_application_insights" "monitoramento" {
  name                = "appi-sigcf"
  location            = azurerm_resource_group.sigcf.location
  resource_group_name = azurerm_resource_group.sigcf.name
  workspace_id        = azurerm_log_analytics_workspace.logs.id
  application_type    = "web"
  tags                = local.tags
}

resource "azurerm_monitor_action_group" "alertas" {
  name                = "ag-sigcf"
  resource_group_name = azurerm_resource_group.sigcf.name
  short_name          = "sigcf"

  email_receiver {
    name                    = "responsavel"
    email_address           = var.email_alertas
    use_common_alert_schema = true
  }

  tags = local.tags
}

resource "azurerm_consumption_budget_subscription" "orcamento" {
  name            = "orcamento-sigcf"
  subscription_id = "/subscriptions/${data.azurerm_client_config.atual.subscription_id}"
  amount          = var.orcamento_mensal_usd
  time_grain      = "Monthly"

  time_period {
    start_date = "2026-11-01T00:00:00Z"
  }

  notification {
    enabled        = true
    threshold      = 50
    threshold_type = "Actual"
    operator       = "GreaterThan"
    contact_emails = [var.email_alertas]
  }

  notification {
    enabled        = true
    threshold      = 100
    threshold_type = "Forecasted"
    operator       = "GreaterThan"
    contact_emails = [var.email_alertas]
  }
}

# --- Imagens -----------------------------------------------------------------

resource "azurerm_container_registry" "imagens" {
  name                = "sigcf${random_string.sufixo.result}"
  location            = azurerm_resource_group.sigcf.location
  resource_group_name = azurerm_resource_group.sigcf.name
  sku                 = "Basic"
  admin_enabled       = false
  tags                = local.tags
}

# Identidade com que os containers baixam as imagens, sem usuário e senha do registry.
resource "azurerm_user_assigned_identity" "aplicacao" {
  name                = "id-sigcf-aplicacao"
  location            = azurerm_resource_group.sigcf.location
  resource_group_name = azurerm_resource_group.sigcf.name
  tags                = local.tags
}

resource "azurerm_role_assignment" "aplicacao_baixa_imagens" {
  scope                = azurerm_container_registry.imagens.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.aplicacao.principal_id
}

# --- Implantação pelo GitHub Actions (OIDC, sem segredo guardado no GitHub) ---

resource "azurerm_user_assigned_identity" "implantacao" {
  name                = "id-sigcf-implantacao"
  location            = azurerm_resource_group.sigcf.location
  resource_group_name = azurerm_resource_group.sigcf.name
  tags                = local.tags
}

# Só jobs dos ambientes do GitHub (que exigem a branch certa) conseguem se passar por esta identidade.
resource "azurerm_federated_identity_credential" "github" {
  for_each = toset(["homologacao", "producao"])

  name                = "github-${each.key}"
  resource_group_name = azurerm_resource_group.sigcf.name
  parent_id           = azurerm_user_assigned_identity.implantacao.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = "https://token.actions.githubusercontent.com"
  subject             = "repo:${var.repositorio_github}:environment:${each.key}"
}

resource "azurerm_role_assignment" "implantacao_gerencia_recursos" {
  scope                = azurerm_resource_group.sigcf.id
  role_definition_name = "Contributor"
  principal_id         = azurerm_user_assigned_identity.implantacao.principal_id
}

resource "azurerm_role_assignment" "implantacao_publica_imagens" {
  scope                = azurerm_container_registry.imagens.id
  role_definition_name = "AcrPush"
  principal_id         = azurerm_user_assigned_identity.implantacao.principal_id
}

resource "azurerm_role_assignment" "implantacao_le_estado" {
  scope                = data.azurerm_storage_account.estado.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.implantacao.principal_id
}

# --- Banco de dados ----------------------------------------------------------

resource "random_password" "mysql" {
  length           = 32
  special          = true
  override_special = "-_."
  min_lower        = 2
  min_upper        = 2
  min_numeric      = 2
  min_special      = 2
}

resource "azurerm_mysql_flexible_server" "banco" {
  name                   = "sigcf-mysql-${random_string.sufixo.result}"
  location               = azurerm_resource_group.sigcf.location
  resource_group_name    = azurerm_resource_group.sigcf.name
  administrator_login    = "sigcfadmin"
  administrator_password = random_password.mysql.result
  sku_name               = "B_Standard_B1ms"
  version                = "8.0.21"
  backup_retention_days  = 7

  storage {
    size_gb = 20
  }

  tags = local.tags

  lifecycle {
    # O Azure escolhe a zona de disponibilidade na criação.
    ignore_changes = [zone]
  }
}

# Acesso só a partir de serviços do Azure, sempre com TLS (exigido pelo servidor).
resource "azurerm_mysql_flexible_server_firewall_rule" "servicos_azure" {
  name                = "permitir-servicos-azure"
  resource_group_name = azurerm_resource_group.sigcf.name
  server_name         = azurerm_mysql_flexible_server.banco.name
  start_ip_address    = "0.0.0.0"
  end_ip_address      = "0.0.0.0"
}

resource "azurerm_mysql_flexible_database" "bancos" {
  for_each = {
    homologacao = "sigcf_homologacao"
    producao    = "sigcf"
  }

  name                = each.value
  resource_group_name = azurerm_resource_group.sigcf.name
  server_name         = azurerm_mysql_flexible_server.banco.name
  charset             = "utf8mb4"
  collation           = "utf8mb4_0900_ai_ci"
}

# --- Ambiente dos containers --------------------------------------------------

resource "azurerm_container_app_environment" "ambiente" {
  name                       = "cae-sigcf"
  location                   = azurerm_resource_group.sigcf.location
  resource_group_name        = azurerm_resource_group.sigcf.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.logs.id
  tags                       = local.tags
}
