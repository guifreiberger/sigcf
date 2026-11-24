package io.github.guifreiberger.sigcf.rastreamento;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.io.File;
import java.io.IOException;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Deque;
import java.util.List;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class EnvioDaFilaTest {

    @Rule
    public TemporaryFolder pasta = new TemporaryFolder();

    private static final long INICIO = 1_793_804_400_000L; // 04/11/2026 15:00 UTC
    private static final String API = "https://sigcf.exemplo/api";

    private FilaDePontos fila;

    // Servidor falso: responde na ordem dada (a última se repete) e guarda o que recebeu.
    private static final class ServidorFalso implements EnvioDaFila.Transporte {
        final Deque<Object> respostas;
        final List<String> corpos = new ArrayList<>();
        String url;
        String token;

        ServidorFalso(Object... respostas) {
            this.respostas = new ArrayDeque<>(Arrays.asList(respostas));
        }

        @Override
        public int enviar(String url, String token, String corpo) throws IOException {
            this.url = url;
            this.token = token;
            corpos.add(corpo);
            Object resposta = respostas.size() > 1 ? respostas.poll() : respostas.peek();
            if (resposta instanceof IOException) throw (IOException) resposta;
            return (Integer) resposta;
        }
    }

    @Before
    public void preparar() {
        fila = new FilaDePontos(new File(pasta.getRoot(), "trajeto-pendente.txt"));
    }

    private void guardar(int quantidade) {
        for (int i = 0; i < quantidade; i++) {
            fila.adicionar(new Ponto(-26.48, -49.07, 8, INICIO + i * 10_000L));
        }
    }

    @Test
    public void enviaEmLotesAteEsvaziarAFila() {
        guardar(250);
        ServidorFalso servidor = new ServidorFalso(204);

        EnvioDaFila.Resumo resumo = EnvioDaFila.enviar(fila, servidor, API, "token-do-joao");

        assertEquals(2, servidor.corpos.size());
        assertEquals("https://sigcf.exemplo/api/rastreamento/pontos", servidor.url);
        assertEquals("token-do-joao", servidor.token);
        assertEquals(0, resumo.pendentes);
        assertEquals(0, fila.tamanho());
        assertFalse(resumo.encerradaNoServidor);
    }

    @Test
    public void montaOCorpoComoOServidorEspera() {
        fila.adicionar(new Ponto(-26.4851234567, -49.0713456, 8, INICIO));
        fila.adicionar(new Ponto(-26.4849, -49.07, null, INICIO + 12_345L));
        ServidorFalso servidor = new ServidorFalso(204);

        EnvioDaFila.enviar(fila, servidor, API, "t");

        assertEquals(
                "{\"pontos\":["
                        + "{\"latitude\":-26.485123,\"longitude\":-49.071346,\"precisaoMetros\":8,"
                        + "\"registradoEm\":\"2026-11-04T15:00:00.000Z\"},"
                        + "{\"latitude\":-26.4849,\"longitude\":-49.07,\"precisaoMetros\":null,"
                        + "\"registradoEm\":\"2026-11-04T15:00:12.345Z\"}]}",
                servidor.corpos.get(0));
    }

    // Uma conexão que caiu (ex.: troca do Wi-Fi para o 4G) não pode apagar o trajeto.
    @Test
    public void guardaOsPontosParaDepoisQuandoNaoHaConexao() {
        guardar(3);
        ServidorFalso servidor = new ServidorFalso(new IOException("timeout"));

        EnvioDaFila.Resumo resumo = EnvioDaFila.enviar(fila, servidor, API, "t");

        assertEquals(3, resumo.pendentes);
        assertEquals(3, fila.tamanho());
        assertEquals(1, servidor.corpos.size());
    }

    @Test
    public void guardaOsPontosQuandoOServidorFalhaOuASessaoExpirou() {
        guardar(2);

        assertEquals(2, EnvioDaFila.enviar(fila, new ServidorFalso(502), API, "t").pendentes);
        assertEquals(2, EnvioDaFila.enviar(fila, new ServidorFalso(401), API, "t").pendentes);
        assertEquals(2, fila.tamanho());
    }

    @Test
    public void descartaOLoteRecusadoPeloServidorESegueComOResto() {
        guardar(250);
        ServidorFalso servidor = new ServidorFalso(400, 204);

        EnvioDaFila.Resumo resumo = EnvioDaFila.enviar(fila, servidor, API, "t");

        assertEquals(2, servidor.corpos.size());
        assertEquals(0, resumo.pendentes);
    }

    // 409: o motorista não tem coleta em andamento (ex.: o gestor cancelou a coleta).
    @Test
    public void avisaQuandoOServidorDizQueNaoHaColetaEmAndamento() {
        guardar(2);

        EnvioDaFila.Resumo resumo = EnvioDaFila.enviar(fila, new ServidorFalso(409), API, "t");

        assertTrue(resumo.encerradaNoServidor);
        assertEquals(0, resumo.pendentes);
    }

    @Test
    public void naoChamaOServidorComAFilaVaziaOuSemSessao() {
        ServidorFalso servidor = new ServidorFalso(204);
        assertEquals(0, EnvioDaFila.enviar(fila, servidor, API, "t").pendentes);

        guardar(1);
        assertEquals(1, EnvioDaFila.enviar(fila, servidor, null, "t").pendentes);
        assertEquals(1, EnvioDaFila.enviar(fila, servidor, API, null).pendentes);

        assertTrue(servidor.corpos.isEmpty());
    }
}
