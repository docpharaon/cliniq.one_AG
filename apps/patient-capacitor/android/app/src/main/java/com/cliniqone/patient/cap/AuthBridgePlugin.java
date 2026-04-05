package com.cliniqone.patient.cap;

import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Capacitor plugin that bridges the Supabase JWT from the
 * WebView to native SharedPreferences so the home-screen
 * widget can call the Supabase REST API independently.
 *
 * JS usage:
 *   import { Plugins } from '@capacitor/core';
 *   const { AuthBridge } = Plugins;
 *   await AuthBridge.syncToken({ token: session.access_token });
 *   await AuthBridge.clearToken();
 *
 * © cliniq.one — Proprietary and confidential.
 */
@CapacitorPlugin(name = "AuthBridge")
public class AuthBridgePlugin extends Plugin {

    private static final String PREFS_NAME = "cliniqone_widget_prefs";
    private static final String KEY_JWT = "supabase_jwt";

    @PluginMethod
    public void syncToken(PluginCall call) {
        String token = call.getString("token");
        if (token == null || token.isEmpty()) {
            call.reject("Token is required");
            return;
        }

        SharedPreferences prefs = getContext()
                .getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_JWT, token).apply();

        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    @PluginMethod
    public void clearToken(PluginCall call) {
        SharedPreferences prefs = getContext()
                .getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE);
        prefs.edit().remove(KEY_JWT).apply();

        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
}
