terraform {
  required_version = ">= 1.9"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 5.13"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.9"
    }
  }

  # Um estado por ambiente: a chave (app-homologacao.tfstate ou app-producao.tfstate)
  # e a conta de armazenamento são informadas no init (ver docs/deploy.md).
  backend "azurerm" {
    use_azuread_auth = true
    container_name   = "tfstate"
  }
}

provider "azurerm" {
  features {}
  resource_provider_registrations = "none"
}
