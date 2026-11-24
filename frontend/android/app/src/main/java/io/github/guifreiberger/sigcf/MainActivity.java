package io.github.guifreiberger.sigcf;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import io.github.guifreiberger.sigcf.rastreamento.RastreamentoPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins do próprio app precisam ser registrados antes de a tela carregar.
        registerPlugin(RastreamentoPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
