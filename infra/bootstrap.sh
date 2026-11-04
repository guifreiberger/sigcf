#!/usr/bin/env bash
# Prepara a assinatura para o Terraform. Roda uma única vez, com `az login` feito:
#   - registra os provedores dos serviços usados;
#   - cria a conta de armazenamento onde o Terraform guarda o estado da infraestrutura;
#   - dá ao usuário logado acesso aos dados dessa conta (sem chaves de acesso).
set -euo pipefail
# No Git Bash do Windows, impede que /subscriptions/... vire um caminho de arquivo.
export MSYS_NO_PATHCONV=1

REGIAO="${REGIAO:-chilecentral}"
GRUPO="${GRUPO:-rg-sigcf-estado}"
CONTA="${CONTA:-sigcfestado$(openssl rand -hex 3)}"

for provedor in Microsoft.App Microsoft.ContainerRegistry Microsoft.DBforMySQL \
  Microsoft.OperationalInsights Microsoft.Insights Microsoft.ManagedIdentity \
  Microsoft.Storage Microsoft.Consumption Microsoft.AlertsManagement; do
  az provider register --namespace "$provedor" --only-show-errors
done

az group create --name "$GRUPO" --location "$REGIAO" --output none
az storage account create --name "$CONTA" --resource-group "$GRUPO" --location "$REGIAO" \
  --sku Standard_LRS --kind StorageV2 --min-tls-version TLS1_2 \
  --allow-blob-public-access false --allow-shared-key-access false --output none
# Versões anteriores do estado ficam guardadas, para recuperar de um erro.
az storage account blob-service-properties update --account-name "$CONTA" \
  --resource-group "$GRUPO" --enable-versioning true --output none

CONTA_ID=$(az storage account show --name "$CONTA" --resource-group "$GRUPO" --query id --output tsv)
USUARIO_ID=$(az ad signed-in-user show --query id --output tsv)
az role assignment create --assignee-object-id "$USUARIO_ID" --assignee-principal-type User \
  --role "Storage Blob Data Contributor" --scope "$CONTA_ID" --output none

# A permissão leva alguns minutos para valer.
for tentativa in $(seq 1 20); do
  if az storage container create --account-name "$CONTA" --name tfstate \
    --auth-mode login --output none 2>/dev/null; then
    break
  fi
  echo "Aguardando a permissão de acesso aos dados ($tentativa/20)..."
  sleep 15
done

echo "Estado do Terraform em: grupo=$GRUPO conta=$CONTA container=tfstate"
