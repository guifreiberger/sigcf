package io.github.guifreiberger.sigcf.rastreamento;

import android.content.Context;
import android.content.SharedPreferences;
import java.io.File;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

// Estado do rastreamento compartilhado pelo serviço e pelo plugin: a fila, o endereço da API,
// o token da sessão e se há coleta em andamento. Os envios passam por uma única fila de
// execução, para o mesmo lote nunca sair duas vezes ao mesmo tempo.
final class CentralDeRastreamento {

    private static final String PREFERENCIAS = "sigcf.rastreamento";
    private static final String ENDERECO = "endereco";
    private static final String TOKEN = "token";
    private static final String ATIVO = "ativo";
    private static final String ENCERRADA = "encerradaNoServidor";

    private static CentralDeRastreamento instancia;

    final FilaDePontos fila;
    private final SharedPreferences preferencias;
    private final ExecutorService envios = Executors.newSingleThreadExecutor();
    private final EnvioDaFila.Transporte transporte = new TransporteHttp();
    private volatile long ultimoEnvio;

    static synchronized CentralDeRastreamento de(Context contexto) {
        if (instancia == null) instancia = new CentralDeRastreamento(contexto.getApplicationContext());
        return instancia;
    }

    private CentralDeRastreamento(Context contexto) {
        fila = new FilaDePontos(new File(contexto.getFilesDir(), "trajeto-pendente.txt"));
        preferencias = contexto.getSharedPreferences(PREFERENCIAS, Context.MODE_PRIVATE);
    }

    // Uma coleta começou: guarda para onde e com que sessão enviar, mesmo se o Android
    // recriar o serviço depois.
    void iniciarCorrida(String endereco, String token) {
        preferencias.edit()
                .putString(ENDERECO, endereco)
                .putString(TOKEN, token)
                .putBoolean(ATIVO, true)
                .putBoolean(ENCERRADA, false)
                .apply();
    }

    void encerrarCorrida(boolean pedidoPeloServidor) {
        preferencias.edit().putBoolean(ATIVO, false).putBoolean(ENCERRADA, pedidoPeloServidor).apply();
    }

    boolean ativo() {
        return preferencias.getBoolean(ATIVO, false);
    }

    boolean encerradaNoServidor() {
        return preferencias.getBoolean(ENCERRADA, false);
    }

    long ultimoEnvio() {
        return ultimoEnvio;
    }

    // Envia a fila em segundo plano e avisa o resultado, na thread dos envios.
    void enviar(Consumer<EnvioDaFila.Resumo> aoTerminar) {
        ultimoEnvio = System.currentTimeMillis();
        envios.execute(() -> {
            EnvioDaFila.Resumo resumo = EnvioDaFila.enviar(
                    fila, transporte, preferencias.getString(ENDERECO, null), preferencias.getString(TOKEN, null));
            aoTerminar.accept(resumo);
        });
    }
}
