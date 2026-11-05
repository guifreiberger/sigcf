variable "regiao" {
  description = "Região dos recursos. A assinatura Azure for Students só libera algumas; a do Chile é a mais próxima do Brasil."
  type        = string
  default     = "chilecentral"
}

variable "email_alertas" {
  description = "E-mail que recebe os alertas de orçamento e de aplicação fora do ar."
  type        = string
}

variable "repositorio_github" {
  description = "Repositório cujos workflows podem implantar (dono/nome)."
  type        = string
  default     = "guifreiberger/sigcf"
}

variable "grupo_estado" {
  description = "Grupo de recursos da conta de armazenamento do estado, criada pelo bootstrap.sh."
  type        = string
  default     = "rg-sigcf-estado"
}

variable "conta_estado" {
  description = "Conta de armazenamento do estado do Terraform, criada pelo bootstrap.sh."
  type        = string
}

variable "orcamento_mensal_usd" {
  description = "Valor mensal a partir do qual chegam alertas de gasto."
  type        = number
  default     = 40
}
