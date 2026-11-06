package io.github.guifreiberger.sigcf.rastreamento;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.JSONObject;

// Ponte entre a tela do app (JavaScript) e o serviço de rastreamento: a tela só liga, desliga
// e consulta; quem grava e envia o trajeto é o serviço (ver frontend/src/nativo/rastreamento.ts).
@CapacitorPlugin(
        name = "Rastreamento",
        permissions = {
            @Permission(
                    alias = "localizacao",
                    strings = {Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}),
            @Permission(alias = "notificacoes", strings = {Manifest.permission.POST_NOTIFICATIONS})
        })
public class RastreamentoPlugin extends Plugin {

    @PluginMethod
    public void iniciar(PluginCall chamada) {
        if (chamada.getString("endereco") == null || chamada.getString("token") == null) {
            chamada.reject("Informe o endereço da API e o token da sessão.");
            return;
        }
        if (getPermissionState("localizacao") != PermissionState.GRANTED) {
            requestPermissionForAlias("localizacao", chamada, "aposLocalizacao");
            return;
        }
        pedirNotificacao(chamada);
    }

    @PermissionCallback
    private void aposLocalizacao(PluginCall chamada) {
        if (getPermissionState("localizacao") != PermissionState.GRANTED) {
            chamada.reject("A localização do SIGCF não foi liberada.", "SEM_PERMISSAO");
            return;
        }
        pedirNotificacao(chamada);
    }

    // No Android 13 ou superior, a notificação fixa só aparece com essa permissão. Sem ela o
    // rastreamento funciona do mesmo jeito, então a resposta do motorista não impede a coleta.
    private void pedirNotificacao(PluginCall chamada) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && getPermissionState("notificacoes") != PermissionState.GRANTED) {
            requestPermissionForAlias("notificacoes", chamada, "aposNotificacao");
            return;
        }
        ligar(chamada);
    }

    @PermissionCallback
    private void aposNotificacao(PluginCall chamada) {
        ligar(chamada);
    }

    private void ligar(PluginCall chamada) {
        try {
            ServicoDeRastreamento.iniciar(getContext(), chamada.getString("endereco"), chamada.getString("token"));
            chamada.resolve();
        } catch (RuntimeException erro) {
            // Ex.: o Android não deixa ligar o serviço com o app em segundo plano.
            chamada.reject("Não foi possível ligar o rastreamento.", "FALHA", erro);
        }
    }

    @PluginMethod
    public void parar(PluginCall chamada) {
        ServicoDeRastreamento.parar(getContext());
        chamada.resolve();
    }

    @PluginMethod
    public void estado(PluginCall chamada) {
        CentralDeRastreamento central = CentralDeRastreamento.de(getContext());
        long ultimaLeitura = central.fila.ultimaLeitura();
        JSObject estado = new JSObject();
        estado.put("ativo", central.ativo());
        estado.put("pendentes", central.fila.tamanho());
        estado.put("ultimaLeitura", ultimaLeitura == 0 ? JSONObject.NULL : ultimaLeitura);
        estado.put("encerradaNoServidor", central.encerradaNoServidor());
        chamada.resolve(estado);
    }

    // Envia agora o que estiver guardado (antes de concluir a coleta ou ao abrir o app).
    @PluginMethod
    public void enviarPendentes(PluginCall chamada) {
        CentralDeRastreamento.de(getContext()).enviar(resumo -> {
            JSObject resultado = new JSObject();
            resultado.put("pendentes", resumo.pendentes);
            chamada.resolve(resultado);
        });
    }

    @PluginMethod
    public void abrirConfiguracoes(PluginCall chamada) {
        Intent intencao = new Intent(
                Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", getContext().getPackageName(), null));
        intencao.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intencao);
        chamada.resolve();
    }
}
