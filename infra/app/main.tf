# Um ambiente do SIGCF (homologação ou produção): o app com o nginx e a API lado a lado.

data "terraform_remote_state" "base" {
  backend = "azurerm"
  config = {
    use_azuread_auth     = true
    resource_group_name  = var.grupo_estado
    storage_account_name = var.conta_estado
    container_name       = "tfstate"
    key                  = "base.tfstate"
  }
}

locals {
  base     = data.terraform_remote_state.base.outputs
  producao = var.ambiente == "producao"
  # Sempre ligada só quando pedido (perto das avaliações); fora disso, a produção dorme como a homologação.
  sempre_ligada = local.producao && var.producao_sempre_ligada
  nome          = local.producao ? "sigcf" : "sigcf-homologacao"
  push          = var.vapid_chave_publica != "" && var.vapid_chave_privada != ""
}

resource "random_password" "jwt" {
  length  = 64
  special = false
}

resource "azurerm_container_app" "sigcf" {
  name                         = local.nome
  resource_group_name          = local.base.grupo_de_recursos
  container_app_environment_id = local.base.ambiente_containers_id
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [local.base.identidade_aplicacao_id]
  }

  registry {
    server   = local.base.registry
    identity = local.base.identidade_aplicacao_id
  }

  secret {
    name  = "banco-senha"
    value = local.base.mysql_senha
  }

  secret {
    name  = "jwt-segredo"
    value = random_password.jwt.result
  }

  dynamic "secret" {
    for_each = local.push ? [1] : []
    content {
      name  = "vapid-chave-privada"
      value = var.vapid_chave_privada
    }
  }

  ingress {
    external_enabled = true
    target_port      = 80

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    # Sem acessos, o app desliga e acorda na primeira requisição (20 a 30 s); sempre ligada, não espera.
    min_replicas = local.sempre_ligada ? 1 : 0
    max_replicas = local.producao ? 2 : 1

    # O nginx recebe as requisições e encaminha /api para a API no mesmo app (localhost).
    container {
      name   = "web"
      image  = "${local.base.registry}/sigcf-web:${var.versao}"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "API_UPSTREAM"
        value = "http://localhost:3000"
      }

      readiness_probe {
        transport = "HTTP"
        port      = 80
        path      = "/"
      }
    }

    container {
      name   = "api"
      image  = "${local.base.registry}/sigcf-api:${var.versao}"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "PORT"
        value = "3000"
      }
      env {
        name  = "DB_HOST"
        value = local.base.mysql_servidor
      }
      env {
        name  = "DB_PORT"
        value = "3306"
      }
      env {
        name  = "DB_USER"
        value = local.base.mysql_usuario
      }
      env {
        name        = "DB_PASSWORD"
        secret_name = "banco-senha"
      }
      env {
        name  = "DB_NAME"
        value = local.base.bancos[var.ambiente]
      }
      env {
        name  = "DB_SSL"
        value = "true"
      }
      env {
        name        = "JWT_SECRET"
        secret_name = "jwt-segredo"
      }
      env {
        name  = "JWT_EXPIRES_IN_SEGUNDOS"
        value = "28800"
      }

      dynamic "env" {
        for_each = local.push ? [1] : []
        content {
          name  = "VAPID_PUBLIC_KEY"
          value = var.vapid_chave_publica
        }
      }
      dynamic "env" {
        for_each = local.push ? [1] : []
        content {
          name        = "VAPID_PRIVATE_KEY"
          secret_name = "vapid-chave-privada"
        }
      }
      dynamic "env" {
        for_each = local.push ? [1] : []
        content {
          name  = "VAPID_SUBJECT"
          value = var.vapid_contato
        }
      }

      # O health check consulta o banco: se a API perder a conexão, o container é reiniciado.
      liveness_probe {
        transport        = "HTTP"
        port             = 3000
        path             = "/api/health"
        initial_delay    = 15
        interval_seconds = 30
      }
    }
  }

  tags = {
    projeto        = "sigcf"
    ambiente       = var.ambiente
    gerenciado_por = "terraform"
  }
}

# --- Monitoramento da produção ----------------------------------------------
# Só com a produção sempre ligada: com ela dormindo, o teste a manteria acordada (e cobrando).
# Cada execução do teste é cobrada, por isso 2 regiões a cada 15 minutos.

resource "azurerm_application_insights_standard_web_test" "disponibilidade" {
  count = local.sempre_ligada ? 1 : 0

  name                    = "sigcf-producao-disponibilidade"
  resource_group_name     = local.base.grupo_de_recursos
  location                = local.base.regiao
  application_insights_id = local.base.application_insights_id
  description             = "Consulta o health check (que inclui o banco) a cada 15 minutos, de duas regiões."
  frequency               = 900
  timeout                 = 30
  enabled                 = true
  geo_locations           = ["latam-br-gru-edge", "us-va-ash-azr"]

  request {
    url       = "https://${azurerm_container_app.sigcf.ingress[0].fqdn}/api/health"
    http_verb = "GET"
  }

  validation_rules {
    expected_status_code        = 200
    ssl_check_enabled           = true
    ssl_cert_remaining_lifetime = 7
  }

  lifecycle {
    # O Azure acrescenta uma tag que liga o teste ao Application Insights.
    ignore_changes = [tags]
  }
}

resource "azurerm_monitor_metric_alert" "fora_do_ar" {
  count = local.sempre_ligada ? 1 : 0

  name                = "sigcf-producao-fora-do-ar"
  resource_group_name = local.base.grupo_de_recursos
  scopes              = [azurerm_application_insights_standard_web_test.disponibilidade[0].id, local.base.application_insights_id]
  description         = "A produção não respondeu ao health check nas duas regiões do teste."
  severity            = 1

  application_insights_web_test_location_availability_criteria {
    web_test_id           = azurerm_application_insights_standard_web_test.disponibilidade[0].id
    component_id          = local.base.application_insights_id
    failed_location_count = 2
  }

  action {
    action_group_id = local.base.grupo_de_alertas_id
  }
}
