package io.github.guifreiberger.sigcf.rastreamento;

import java.io.IOException;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

// POST em JSON pela rede do Android, com tempo-limite: sem ele, uma conexão que caiu (como na
// troca do Wi-Fi para o 4G) prende o envio para sempre.
final class TransporteHttp implements EnvioDaFila.Transporte {

    private static final int TEMPO_CONEXAO_MS = 15_000;
    private static final int TEMPO_RESPOSTA_MS = 20_000;

    @Override
    public int enviar(String url, String token, String corpoJson) throws IOException {
        HttpURLConnection conexao = (HttpURLConnection) new URL(url).openConnection();
        try {
            conexao.setConnectTimeout(TEMPO_CONEXAO_MS);
            conexao.setReadTimeout(TEMPO_RESPOSTA_MS);
            conexao.setRequestMethod("POST");
            conexao.setDoOutput(true);
            conexao.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            conexao.setRequestProperty("Authorization", "Bearer " + token);
            byte[] corpo = corpoJson.getBytes(StandardCharsets.UTF_8);
            conexao.setFixedLengthStreamingMode(corpo.length);
            try (OutputStream saida = conexao.getOutputStream()) {
                saida.write(corpo);
            }
            return conexao.getResponseCode();
        } finally {
            conexao.disconnect();
        }
    }
}
