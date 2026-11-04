terraform {
  required_version = ">= 1.9"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.81"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.9"
    }
    azapi = {
      source  = "Azure/azapi"
      version = "~> 2.13"
    }
  }

  # A conta de armazenamento é informada no init (ver docs/deploy.md).
  backend "azurerm" {
    use_azuread_auth = true
    container_name   = "tfstate"
    key              = "base.tfstate"
  }
}

provider "azurerm" {
  features {}
  # Os provedores necessários são registrados pelo bootstrap.sh; registrar todos
  # automaticamente falha na assinatura de estudante.
  resource_provider_registrations = "none"
}

provider "azapi" {}
