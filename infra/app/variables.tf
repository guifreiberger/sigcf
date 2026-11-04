variable "ambiente" {
  description = "Ambiente a implantar."
  type        = string

  validation {
    condition     = contains(["homologacao", "producao"], var.ambiente)
    error_message = "Use homologacao ou producao."
  }
}

variable "versao" {
  description = "Tag das imagens no registry (o SHA do commit). Para voltar a uma versão anterior, implante o SHA dela."
  type        = string
}

variable "grupo_estado" {
  type    = string
  default = "rg-sigcf-estado"
}

variable "conta_estado" {
  description = "Conta de armazenamento do estado do Terraform, criada pelo bootstrap.sh."
  type        = string
}

variable "vapid_chave_publica" {
  description = "Chave pública VAPID das notificações push. Vazia desliga os avisos."
  type        = string
  default     = ""
}

variable "vapid_chave_privada" {
  type      = string
  default   = ""
  sensitive = true
}

variable "vapid_contato" {
  description = "Contato informado aos serviços de push (mailto:...)."
  type        = string
  default     = ""
}
