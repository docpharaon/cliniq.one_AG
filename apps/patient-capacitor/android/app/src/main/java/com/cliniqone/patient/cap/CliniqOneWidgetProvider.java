package com.cliniqone.patient.cap;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.widget.RemoteViews;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Calendar;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

/**
 * cliniq.one Patient App Widget — shows token balance, active
 * consultation status, health tip of the day, and quick-action
 * deep-links into the Capacitor WebView app.
 *
 * © cliniq.one — Proprietary and confidential.
 */
public class CliniqOneWidgetProvider extends AppWidgetProvider {

    private static final String SUPABASE_URL = "https://uabbndansgxpvogteyxc.supabase.co";
    private static final String SUPABASE_ANON_KEY =
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhYmJuZGFuc2d4cHZvZ3RleXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNzIyODgsImV4cCI6MjA4Njg0ODI4OH0.bFh8Wa4koQrtdrD62N7BzsCCGXqBMhFJLr8RiO-3OEc";
    private static final String PREFS_NAME = "cliniqone_widget_prefs";
    private static final String KEY_JWT = "supabase_jwt";

    private static final String[] ACTIVE_STATUSES = {
            "submitted", "assigned", "in_progress", "inquiry_sent"
    };

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Gson gson = new Gson();

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int widgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId);
        }
    }

    private void updateWidget(Context context, AppWidgetManager manager, int widgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String jwt = prefs.getString(KEY_JWT, null);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);

        // Set up deep-link intents
        setDeepLinkIntent(context, views, R.id.btn_new_consult, "/intake");
        setDeepLinkIntent(context, views, R.id.btn_history, "/(tabs)/consultations");
        setAppOpenIntent(context, views, R.id.widget_root);

        if (jwt == null || jwt.isEmpty()) {
            // Not logged in — show placeholder
            views.setTextViewText(R.id.txt_token_balance, "–");
            views.setTextViewText(R.id.txt_status, "Please log in to cliniq.one");
            views.setTextViewText(R.id.txt_tip_title, "");
            views.setTextViewText(R.id.txt_tip_body, "");
            manager.updateAppWidget(widgetId, views);
            return;
        }

        // Fetch data on background thread
        executor.execute(() -> {
            WidgetData data = fetchWidgetData(jwt);
            mainHandler.post(() -> {
                views.setTextViewText(R.id.txt_token_balance, data.tokenBalance);
                views.setTextViewText(R.id.txt_status, data.consultationStatus);
                views.setTextViewText(R.id.txt_tip_title, data.tipTitle);
                views.setTextViewText(R.id.txt_tip_body, data.tipBody);
                manager.updateAppWidget(widgetId, views);
            });
        });
    }

    private WidgetData fetchWidgetData(String jwt) {
        WidgetData data = new WidgetData();

        // 1. Fetch profile (token balance)
        try {
            String profileJson = supabaseGet(
                    "/rest/v1/profiles?select=tokens_balance&limit=1", jwt);
            JsonArray arr = gson.fromJson(profileJson, JsonArray.class);
            if (arr != null && arr.size() > 0) {
                int balance = arr.get(0).getAsJsonObject()
                        .get("tokens_balance").getAsInt();
                data.tokenBalance = String.valueOf(balance);
            }
        } catch (Exception e) {
            data.tokenBalance = "–";
        }

        // 2. Fetch active consultation
        try {
            String statusFilter = "status=in.(submitted,assigned,in_progress,inquiry_sent)";
            String consultJson = supabaseGet(
                    "/rest/v1/consultations?select=status,chief_complaint&"
                            + statusFilter + "&order=created_at.desc&limit=1", jwt);
            JsonArray arr = gson.fromJson(consultJson, JsonArray.class);
            if (arr != null && arr.size() > 0) {
                JsonObject c = arr.get(0).getAsJsonObject();
                String status = c.get("status").getAsString();
                data.consultationStatus = getStatusEmoji(status) + " " + formatStatus(status);
            } else {
                data.consultationStatus = "No active consultations";
            }
        } catch (Exception e) {
            data.consultationStatus = "–";
        }

        // 3. Fetch health tips (approved + active)
        try {
            String tipsJson = supabaseGet(
                    "/rest/v1/health_tips?select=icon,title_en,text_en"
                            + "&is_active=eq.true&approval_status=eq.approved"
                            + "&order=sort_order", jwt);
            JsonArray arr = gson.fromJson(tipsJson, JsonArray.class);
            if (arr != null && arr.size() > 0) {
                int dayOfYear = Calendar.getInstance().get(Calendar.DAY_OF_YEAR);
                int idx = dayOfYear % arr.size();
                JsonObject tip = arr.get(idx).getAsJsonObject();
                String icon = tip.has("icon") ? tip.get("icon").getAsString() : "💡";
                data.tipTitle = icon + " " + tip.get("title_en").getAsString();
                data.tipBody = tip.get("text_en").getAsString();
            }
        } catch (Exception e) {
            data.tipTitle = "💡 Stay Healthy";
            data.tipBody = "Open the app for health tips";
        }

        return data;
    }

    private String supabaseGet(String path, String jwt) throws Exception {
        URL url = new URL(SUPABASE_URL + path);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("apikey", SUPABASE_ANON_KEY);
        conn.setRequestProperty("Authorization", "Bearer " + jwt);
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(10000);

        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(conn.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
        } finally {
            conn.disconnect();
        }
        return sb.toString();
    }

    private void setDeepLinkIntent(Context context, RemoteViews views, int viewId, String route) {
        Intent intent = new Intent(Intent.ACTION_VIEW,
                Uri.parse("https://com.cliniqone.patient.cap" + route));
        intent.setPackage(context.getPackageName());
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent pi = PendingIntent.getActivity(context, viewId, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(viewId, pi);
    }

    private void setAppOpenIntent(Context context, RemoteViews views, int viewId) {
        Intent intent = context.getPackageManager()
                .getLaunchIntentForPackage(context.getPackageName());
        if (intent != null) {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            PendingIntent pi = PendingIntent.getActivity(context, 0, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(viewId, pi);
        }
    }

    private String getStatusEmoji(String status) {
        switch (status) {
            case "submitted": return "📧";
            case "assigned": return "👨‍⚕️";
            case "in_progress": return "🔄";
            case "inquiry_sent": return "🔍";
            default: return "🩺";
        }
    }

    private String formatStatus(String status) {
        switch (status) {
            case "submitted": return "Submitted";
            case "assigned": return "Doctor Assigned";
            case "in_progress": return "In Progress";
            case "inquiry_sent": return "Doctor Inquiry";
            default: return status;
        }
    }

    /** Simple data holder for widget content */
    private static class WidgetData {
        String tokenBalance = "–";
        String consultationStatus = "–";
        String tipTitle = "💡 Stay Healthy";
        String tipBody = "Open the app for health tips";
    }
}
