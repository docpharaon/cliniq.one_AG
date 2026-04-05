package com.cliniqone.patient.cap;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AuthBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
