package com.example.whatsapptaskmanager

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import com.example.whatsapptaskmanager.api.MessageRequest
import com.example.whatsapptaskmanager.api.MessageResponse
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

        DebugStatusManager.updateStatus(MonitorStatus.NOTIFICATION_RECEIVED)
        Log.d(TAG, "WhatsApp notification detected")

        DebugStatusManager.updateStatus(MonitorStatus.EXTRACTING)
        val notification = sbn.notification
        val extras = notification.extras

        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
        val timestamp = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS", Locale.getDefault()).format(Date())

        DebugStatusManager.updateStatus(
            status = MonitorStatus.EXTRACTED,
            sender = title ?: "Unknown",
            message = text ?: "No text",
            timestamp = timestamp
        )

        Log.d(TAG, "Package: ${sbn.packageName}")
        Log.d(TAG, "Sender: ${title ?: "Unknown"}")
        Log.d(TAG, "Message: ${text ?: "No text"}")
        Log.d(TAG, "ReceivedAt: $timestamp")

        if (text.isNullOrBlank()) {
            Log.d(TAG, "Ignoring notification: empty message")
            DebugStatusManager.updateStatus(MonitorStatus.IDLE)
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
            DebugStatusManager.updateStatus(MonitorStatus.IDLE)
            return
        }

        val request = MessageRequest(
            source = "whatsapp",
            sender = title ?: "Unknown",
            message = text,
            receivedAt = timestamp
        )

        DebugStatusManager.updateStatus(MonitorStatus.SENDING)
        Log.d(TAG, "Sending message to backend...")
        
        RetrofitClient.instance.sendMessage(request).enqueue(object : Callback<MessageResponse> {
            override fun onResponse(call: Call<MessageResponse>, response: Response<MessageResponse>) {
                if (response.isSuccessful) {
                    val body = response.body()
                    Log.d(TAG, "Successfully sent message to backend. Success: ${body?.success}")
                    
                    val classification = body?.classification
                    val status = if (classification?.isTask == true) MonitorStatus.SUCCESS else MonitorStatus.NO_TASK
                    
                    body?.task?.let { taskData ->
                        AlarmScheduler.scheduleAlarm(applicationContext, taskData)
                    }

                    DebugStatusManager.updateStatus(
                        status = status,
                        httpStatus = response.code(),
                        backendResponse = body?.toString()
                    )
                } else {
                    Log.e(TAG, "Failed to send message: ${response.code()}")
                    DebugStatusManager.updateStatus(
                        status = MonitorStatus.FAILED,
                        error = "HTTP ${response.code()}: ${response.message()}",
                        httpStatus = response.code()
                    )
                }
            }

            override fun onFailure(call: Call<MessageResponse>, t: Throwable) {
                Log.e(TAG, "Error sending message: ${t.message}")
                DebugStatusManager.updateStatus(
                    status = MonitorStatus.FAILED,
                    error = t.message ?: "Unknown network error"
                )
            }
        })
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.d(TAG, "Notification Listener Connected")
        DebugStatusManager.updateStatus(MonitorStatus.LISTENER_CONNECTED)
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.d(TAG, "Notification Listener Disconnected")
        DebugStatusManager.updateStatus(MonitorStatus.DISCONNECTED)
    }
}
