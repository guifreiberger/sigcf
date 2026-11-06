package io.github.guifreiberger.sigcf.rastreamento;

import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

// Envia a fila ao servidor (POST /rastreamento/pontos) em lotes, do mais antigo ao mais novo,
// até esvaziar ou a conexão falhar. O servidor grava cada leitura na coleta que estava em
// andamento no horário dela, então enviar com atraso não tira o ponto do lugar.
public final class EnvioDaFila {

    // Separado para os testes trocarem a rede por um servidor falso.
    public interface Transporte {
        // Devolve o status HTTP da resposta; lança IOException se não houve resposta.
        int enviar(String url, String token, String corpoJson) throws IOException;
    }

    public static final class Resumo {
        public final int pendentes;
        // O servidor respondeu 409: o motorista não tem coleta em andamento (ex.: o gestor a
        // cancelou), e o rastreamento deve parar.
        public final boolean encerradaNoServidor;

        Resumo(int pendentes, boolean encerradaNoServidor) {
            this.pendentes = pendentes;
            this.encerradaNoServidor = encerradaNoServidor;
        }
    }

    private EnvioDaFila() {}

    public static Resumo enviar(FilaDePontos fila, Transporte transporte, String enderecoDaApi, String token) {
        boolean encerrada = false;
        if (enderecoDaApi == null || token == null) return new Resumo(fila.tamanho(), false);

        while (fila.tamanho() > 0) {
            List<Ponto> lote = fila.lote();
            int status;
            try {
                status = transporte.enviar(enderecoDaApi + "/rastreamento/pontos", token, corpo(lote));
            } catch (IOException semResposta) {
                status = 0;
            }
            // Sem conexão, servidor fora do ar ou sessão expirada: o lote fica para depois.
            if (status == 0 || status >= 500 || status == 401 || status == 408 || status == 429) break;
            // Recebido, ou recusado de vez (reenviar não adiantaria): sai da fila.
            if (status == 409) encerrada = true;
            fila.remover(lote.size());
        }
        return new Resumo(fila.tamanho(), encerrada);
    }

    static String corpo(List<Ponto> pontos) {
        SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.ROOT);
        iso.setTimeZone(TimeZone.getTimeZone("UTC"));
        StringBuilder json = new StringBuilder("{\"pontos\":[");
        for (int i = 0; i < pontos.size(); i++) {
            Ponto ponto = pontos.get(i);
            if (i > 0) json.append(',');
            json.append("{\"latitude\":").append(arredondar(ponto.latitude))
                    .append(",\"longitude\":").append(arredondar(ponto.longitude))
                    .append(",\"precisaoMetros\":").append(ponto.precisaoMetros)
                    .append(",\"registradoEm\":\"").append(iso.format(new Date(ponto.registradoEm)))
                    .append("\"}");
        }
        return json.append("]}").toString();
    }

    // Seis casas decimais (cerca de 10 cm) bastam para o mapa.
    private static String arredondar(double grau) {
        return java.math.BigDecimal.valueOf(grau)
                .setScale(6, java.math.RoundingMode.HALF_UP)
                .stripTrailingZeros()
                .toPlainString();
    }
}
