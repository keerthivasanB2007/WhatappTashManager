package com.example.whatsapptaskmanager

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import com.example.whatsapptaskmanager.api.MessageRequest
import com.example.whatsapptaskmanager.api.RetrofitClient
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class WhatsAppNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "WhatsAppTaskManager"
        private const val WHATSAPP_PACKAGE = "com.whatsapp"
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)

        if (sbn == null || sbn.packageName != WHATSAPP_PACKAGE) {
            return
        }

        val notification = sbn.notification
        val extras = notification.extras

        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
        val timestamp = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS", Locale.getDefault()).format(Date())

        Log.d(TAG, "WhatsApp notification detected")
        Log.d(TAG, "Package: ${sbn.packageName}")
        Log.d(TAG, "Sender: ${title ?: "Unknown"}")
        Log.d(TAG, "Message: ${text ?: "No text"}")
        Log.d(TAG, "ReceivedAt: $timestamp")

        if (text.isNullOrBlank()) {
            Log.d(TAG, "Ignoring notification: empty message")
            return
        }

        val lowerTitle = title?.lowercase() ?: ""
        val lowerText = text.lowercase()

        val isSystemNotification = listOf(
            "backup in progress",
            "uploading",
            "downloading",
            "whatsapp web",
            "calling",
            "missed call",
            "checking for new messages"
        ).any { lowerTitle.contains(it) || lowerText.contains(it) }

        if (isSystemNotification) {
            Log.d(TAG, "Ignoring system notification: $title - $text")
            return
        }

        val request = MessageRequest(
            source = "whatsapp",
            sender = title ?: "Unknown",
            message = text,
            receivedAt = timestamp
        )

        Log.d(TAG, "Sending message to backend...")
        RetrofitClient.instance.sendMessage(request).enqueue(object : Callback<Any> {
            override fun onResponse(call: Call<Any>, response: Response<Any>) {
                if (response.isSuccessful) {
                    Log.d(TAG, "Successfully sent message to backend")
                } else {
                    Log.e(TAG, "Failed to send message: ${response.code()}")
                }
            }

            override fun onFailure(call: Call<Any>, t: Throwable) {
                Log.e(TAG, "Error sending message: ${t.message}")
            }
        })
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.d(TAG, "Notification Listener Connected")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.d(TAG, "Notification Listener Disconnected")
    }
}
