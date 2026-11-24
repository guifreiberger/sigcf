package io.github.guifreiberger.sigcf.rastreamento;

// Uma leitura do GPS durante a coleta.
public final class Ponto {

    public final double latitude;
    public final double longitude;
    // Nula quando o GPS não informa a precisão.
    public final Integer precisaoMetros;
    // Momento da leitura no aparelho, em milissegundos desde 1970 (UTC).
    public final long registradoEm;

    public Ponto(double latitude, double longitude, Integer precisaoMetros, long registradoEm) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.precisaoMetros = precisaoMetros;
        this.registradoEm = registradoEm;
    }
}
