package io.github.guifreiberger.sigcf.rastreamento;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.List;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class FilaDePontosTest {

    @Rule
    public TemporaryFolder pasta = new TemporaryFolder();

    private static final long INICIO = 1_793_804_400_000L; // 04/11/2026 15:00 UTC

    private File arquivo;

    private static Ponto ponto(double latitude, int segundos) {
        return new Ponto(latitude, -49.07, 8, INICIO + segundos * 1000L);
    }

    @Before
    public void preparar() {
        arquivo = new File(pasta.getRoot(), "trajeto-pendente.txt");
    }

    @Test
    public void guardaNoMaximoUmaLeituraACada10Segundos() {
        FilaDePontos fila = new FilaDePontos(arquivo);

        assertTrue(fila.adicionar(ponto(-26.48, 0)));
        assertFalse(fila.adicionar(ponto(-26.481, 4)));
        assertTrue(fila.adicionar(ponto(-26.482, 10)));

        assertEquals(2, fila.tamanho());
        assertEquals(INICIO + 10_000L, fila.ultimaLeitura());
    }

    // O Android pode encerrar o app e o serviço; a fila salva no aparelho não se perde.
    @Test
    public void continuaDeOndeParouDepoisQueOAppReinicia() {
        FilaDePontos fila = new FilaDePontos(arquivo);
        fila.adicionar(new Ponto(-26.485123, -49.071346, null, INICIO));
        fila.adicionar(ponto(-26.48, 12));

        FilaDePontos depois = new FilaDePontos(arquivo);

        assertEquals(2, depois.tamanho());
        Ponto primeiro = depois.lote().get(0);
        assertEquals(-26.485123, primeiro.latitude, 1e-9);
        assertEquals(-49.071346, primeiro.longitude, 1e-9);
        assertNull(primeiro.precisaoMetros);
        assertEquals(INICIO, primeiro.registradoEm);
        assertFalse(depois.adicionar(ponto(-26.47, 15)));
    }

    @Test
    public void entregaLotesDeAte200ERemoveSoOQueFoiEnviado() {
        FilaDePontos fila = new FilaDePontos(arquivo);
        for (int i = 0; i < 250; i++) fila.adicionar(ponto(-26.48, i * 10));

        List<Ponto> lote = fila.lote();
        assertEquals(200, lote.size());
        fila.remover(lote.size());

        assertEquals(50, fila.tamanho());
        assertEquals(INICIO + 2_000_000L, fila.lote().get(0).registradoEm);
        assertEquals(50, new FilaDePontos(arquivo).tamanho());
    }

    // Cerca de 5 horas sem sinal; acima disso as leituras mais antigas são descartadas.
    @Test
    public void descartaAsLeiturasMaisAntigasAcimaDoLimite() {
        FilaDePontos fila = new FilaDePontos(arquivo);
        for (int i = 0; i < 2_005; i++) fila.adicionar(ponto(-26.48, i * 10));

        assertEquals(2_000, fila.tamanho());
        assertEquals(INICIO + 50_000L, fila.lote().get(0).registradoEm);
        assertEquals(2_000, new FilaDePontos(arquivo).tamanho());
    }

    @Test
    public void ignoraLinhasCorrompidasDoArquivo() throws Exception {
        Files.write(
                arquivo.toPath(),
                "lixo\n-26.48,-49.07,8,1793804400000\n1,2\n".getBytes(StandardCharsets.UTF_8));

        FilaDePontos fila = new FilaDePontos(arquivo);

        assertEquals(1, fila.tamanho());
        assertEquals(Integer.valueOf(8), fila.lote().get(0).precisaoMetros);
    }

    @Test
    public void comecaVaziaSemArquivo() {
        FilaDePontos fila = new FilaDePontos(arquivo);

        assertEquals(0, fila.tamanho());
        assertEquals(0L, fila.ultimaLeitura());
        assertTrue(fila.lote().isEmpty());
    }
}
