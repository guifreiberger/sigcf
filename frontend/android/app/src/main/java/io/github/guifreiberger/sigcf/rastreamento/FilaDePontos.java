package io.github.guifreiberger.sigcf.rastreamento;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

// Leituras do GPS que ainda não chegaram ao servidor, salvas num arquivo do app para não se
// perderem sem sinal ou se o Android encerrar o app. Uma linha por leitura:
// latitude,longitude,precisão,horário.
public final class FilaDePontos {

    // Uma leitura a cada 10 s desenha bem o trajeto sem gastar bateria e dados à toa.
    static final long INTERVALO_MINIMO_MS = 10_000;
    // Cerca de 5 horas sem sinal; acima disso as leituras mais antigas são descartadas.
    static final int LIMITE = 2_000;
    // O servidor aceita até 200 leituras por envio.
    static final int LOTE_MAXIMO = 200;

    private final File arquivo;
    private final List<Ponto> pontos;
    private long ultimaLeitura;

    public FilaDePontos(File arquivo) {
        this.arquivo = arquivo;
        this.pontos = ler(arquivo);
        this.ultimaLeitura = pontos.isEmpty() ? 0 : pontos.get(pontos.size() - 1).registradoEm;
    }

    // Guarda a leitura, se passaram 10 s da anterior. Devolve se ela foi guardada.
    public synchronized boolean adicionar(Ponto ponto) {
        if (ultimaLeitura != 0 && ponto.registradoEm - ultimaLeitura < INTERVALO_MINIMO_MS) {
            return false;
        }
        ultimaLeitura = ponto.registradoEm;
        pontos.add(ponto);
        if (pontos.size() > LIMITE) {
            pontos.subList(0, pontos.size() - LIMITE).clear();
            salvarTudo();
        } else {
            acrescentar(ponto);
        }
        return true;
    }

    // As leituras mais antigas, até o tamanho de um envio.
    public synchronized List<Ponto> lote() {
        return new ArrayList<>(pontos.subList(0, Math.min(LOTE_MAXIMO, pontos.size())));
    }

    // Tira da fila as primeiras leituras, depois que o servidor as recebeu.
    public synchronized void remover(int quantidade) {
        pontos.subList(0, Math.min(quantidade, pontos.size())).clear();
        salvarTudo();
    }

    public synchronized int tamanho() {
        return pontos.size();
    }

    // Horário da última leitura guardada, ou 0 se nenhuma foi guardada.
    public synchronized long ultimaLeitura() {
        return ultimaLeitura;
    }

    private static String linha(Ponto ponto) {
        return String.format(
                Locale.ROOT,
                "%s,%s,%s,%d%n",
                ponto.latitude,
                ponto.longitude,
                ponto.precisaoMetros == null ? "" : ponto.precisaoMetros.toString(),
                ponto.registradoEm);
    }

    private static List<Ponto> ler(File arquivo) {
        List<Ponto> lidos = new ArrayList<>();
        if (!arquivo.exists()) return lidos;
        try (BufferedReader leitor = new BufferedReader(
                new InputStreamReader(new FileInputStream(arquivo), StandardCharsets.UTF_8))) {
            String texto;
            while ((texto = leitor.readLine()) != null) {
                Ponto ponto = interpretar(texto);
                if (ponto != null) lidos.add(ponto);
            }
        } catch (IOException ignorado) {
            // Arquivo ilegível: começa do zero em vez de travar o rastreamento.
        }
        return lidos;
    }

    private static Ponto interpretar(String texto) {
        String[] partes = texto.split(",", -1);
        if (partes.length != 4) return null;
        try {
            return new Ponto(
                    Double.parseDouble(partes[0]),
                    Double.parseDouble(partes[1]),
                    partes[2].isEmpty() ? null : Integer.valueOf(partes[2]),
                    Long.parseLong(partes[3]));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private void acrescentar(Ponto ponto) {
        try (Writer escritor = new OutputStreamWriter(
                new FileOutputStream(arquivo, true), StandardCharsets.UTF_8)) {
            escritor.write(linha(ponto));
        } catch (IOException ignorado) {
            // Sem espaço no aparelho: a leitura fica só na memória até o próximo envio.
        }
    }

    // Grava num arquivo temporário e troca de uma vez, para um desligamento no meio não
    // corromper a fila.
    private void salvarTudo() {
        File temporario = new File(arquivo.getPath() + ".tmp");
        try (Writer escritor = new OutputStreamWriter(
                new FileOutputStream(temporario, false), StandardCharsets.UTF_8)) {
            for (Ponto ponto : pontos) escritor.write(linha(ponto));
        } catch (IOException e) {
            return;
        }
        if (!temporario.renameTo(arquivo)) {
            arquivo.delete();
            temporario.renameTo(arquivo);
        }
    }
}
