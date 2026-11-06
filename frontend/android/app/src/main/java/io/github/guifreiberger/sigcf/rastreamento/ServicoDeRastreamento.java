package io.github.guifreiberger.sigcf.rastreamento;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import io.github.guifreiberger.sigcf.R;

// Serviço do Android que grava o trajeto durante a coleta, com uma notificação fixa. Ele mesmo
// guarda cada leitura do GPS e a envia ao servidor, sem passar pela tela do app: com a tela
// apagada e o celular fora da tomada, o Android congela a WebView, mas não um serviço em
// primeiro plano (ADR 0010).
public class ServicoDeRastreamento extends Service {

    private static final String TAG = "SIGCF/Rastreamento";
    private static final String ACAO_INICIAR = "io.github.guifreiberger.sigcf.rastreamento.INICIAR";
    private static final String ENDERECO = "endereco";
    private static final String TOKEN = "token";
    private static final String CANAL = "rastreamento";
    private static final int NOTIFICACAO = 7311;
    private static final long INTERVALO_LEITURA_MS = FilaDePontos.INTERVALO_MINIMO_MS;
    private static final long INTERVALO_ENVIO_MS = 15_000;

    private static volatile ServicoDeRastreamento atual;

    private CentralDeRastreamento central;
    private FusedLocationProviderClient gps;
    private Handler principal;
    private boolean acompanhando;
    private boolean encerrando;

    private final LocationCallback aoLer = new LocationCallback() {
        @Override
        public void onLocationResult(@NonNull LocationResult resultado) {
            for (Location local : resultado.getLocations()) {
                central.fila.adicionar(new Ponto(
                        local.getLatitude(),
                        local.getLongitude(),
                        local.hasAccuracy() ? Math.round(local.getAccuracy()) : null,
                        local.getTime()));
            }
            // Enviar a partir da própria leitura funciona mesmo com o processador dormindo
            // entre uma leitura e outra, quando o relógio do ciclo abaixo atrasa.
            if (System.currentTimeMillis() - central.ultimoEnvio() >= INTERVALO_ENVIO_MS) enviar();
        }
    };

    private final Runnable cicloDeEnvio = new Runnable() {
        @Override
        public void run() {
            if (System.currentTimeMillis() - central.ultimoEnvio() >= INTERVALO_ENVIO_MS) enviar();
            principal.postDelayed(this, INTERVALO_ENVIO_MS);
        }
    };

    // Liga o rastreamento; chamado pelo app com a tela aberta, ao iniciar ou retomar a coleta.
    static void iniciar(Context contexto, String endereco, String token) {
        Intent intencao = new Intent(contexto, ServicoDeRastreamento.class)
                .setAction(ACAO_INICIAR)
                .putExtra(ENDERECO, endereco)
                .putExtra(TOKEN, token);
        ContextCompat.startForegroundService(contexto, intencao);
    }

    // Desliga o GPS; o que ainda estiver na fila tenta sair antes de o serviço terminar.
    static void parar(Context contexto) {
        CentralDeRastreamento.de(contexto).encerrarCorrida(false);
        ServicoDeRastreamento servico = atual;
        if (servico != null) servico.principal.post(() -> servico.encerrar(false));
    }

    @Override
    public void onCreate() {
        super.onCreate();
        central = CentralDeRastreamento.de(this);
        gps = LocationServices.getFusedLocationProviderClient(this);
        principal = new Handler(Looper.getMainLooper());
        criarCanal();
        atual = this;
    }

    @Override
    public int onStartCommand(Intent intencao, int flags, int startId) {
        // Quem chama startForegroundService espera a notificação em até 5 segundos.
        if (!promover()) {
            stopSelf();
            return START_NOT_STICKY;
        }
        if (intencao != null && ACAO_INICIAR.equals(intencao.getAction())) {
            central.iniciarCorrida(intencao.getStringExtra(ENDERECO), intencao.getStringExtra(TOKEN));
            encerrando = false;
        } else if (!central.ativo()) {
            // Recriado pelo Android depois que a coleta já tinha terminado.
            encerrar(false);
            return START_NOT_STICKY;
        }
        acompanhar();
        // Se o Android encerrar o serviço por falta de memória, ele é recriado e continua.
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        pararDeAcompanhar();
        if (atual == this) atual = null;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intencao) {
        return null;
    }

    @SuppressLint("MissingPermission") // conferida em temPermissao()
    private void acompanhar() {
        if (acompanhando) return;
        if (!temPermissao()) {
            Log.w(TAG, "Sem permissão de localização; rastreamento não iniciado.");
            encerrar(false);
            return;
        }
        LocationRequest pedido = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, INTERVALO_LEITURA_MS)
                .setMinUpdateIntervalMillis(INTERVALO_LEITURA_MS / 2)
                .build();
        try {
            gps.requestLocationUpdates(pedido, aoLer, Looper.getMainLooper());
        } catch (SecurityException semPermissao) {
            encerrar(false);
            return;
        }
        acompanhando = true;
        principal.postDelayed(cicloDeEnvio, INTERVALO_ENVIO_MS);
    }

    private void pararDeAcompanhar() {
        if (!acompanhando) return;
        gps.removeLocationUpdates(aoLer);
        principal.removeCallbacks(cicloDeEnvio);
        acompanhando = false;
    }

    private void enviar() {
        central.enviar(resumo -> {
            // 409: o servidor não tem coleta em andamento para o motorista (ex.: cancelada).
            if (resumo.encerradaNoServidor && central.ativo()) principal.post(() -> encerrar(true));
        });
    }

    // Para o GPS, tenta enviar o que ficou e termina o serviço. O que não sair agora fica no
    // aparelho e é enviado quando o motorista abrir o app.
    private void encerrar(boolean pedidoPeloServidor) {
        if (pedidoPeloServidor) central.encerrarCorrida(true);
        pararDeAcompanhar();
        if (encerrando) return;
        encerrando = true;
        central.enviar(resumo -> principal.post(() -> {
            // Uma nova coleta pode ter começado enquanto o último envio acontecia.
            if (central.ativo()) {
                encerrando = false;
                return;
            }
            ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
            stopSelf();
        }));
    }

    private boolean temPermissao() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                        == PackageManager.PERMISSION_GRANTED
                || ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
                        == PackageManager.PERMISSION_GRANTED;
    }

    private boolean promover() {
        Intent abrirApp = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent aoTocar = abrirApp == null
                ? null
                : PendingIntent.getActivity(
                        this, 0, abrirApp, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification notificacao = new NotificationCompat.Builder(this, CANAL)
                .setSmallIcon(R.drawable.ic_notificacao)
                .setColor(ContextCompat.getColor(this, R.color.ic_launcher_background))
                .setContentTitle(getString(R.string.rastreamento_titulo))
                .setContentText(getString(R.string.rastreamento_texto))
                .setContentIntent(aoTocar)
                .setOngoing(true)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
        try {
            ServiceCompat.startForeground(
                    this,
                    NOTIFICACAO,
                    notificacao,
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ? ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION : 0);
            return true;
        } catch (RuntimeException erro) {
            // Ex.: o Android recriou o serviço com o app em segundo plano e não deixa usar o GPS.
            Log.w(TAG, "Não foi possível manter o rastreamento em primeiro plano.", erro);
            return false;
        }
    }

    private void criarCanal() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel canal = new NotificationChannel(
                CANAL, getString(R.string.rastreamento_canal), NotificationManager.IMPORTANCE_LOW);
        canal.setShowBadge(false);
        getSystemService(NotificationManager.class).createNotificationChannel(canal);
    }
}
