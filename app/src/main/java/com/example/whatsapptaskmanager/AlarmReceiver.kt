package com.example.whatsapptaskmanager

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.example.whatsapptaskmanager.api.RetrofitClient
import com.example.whatsapptaskmanager.api.ReminderResponse
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class AlarmReceiver : BroadcastReceiver() {
    companion object {
        private const val CHANNEL_ID = "task_reminders"
        private const val TAG = "AlarmReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val taskId = intent.getStringExtra("TASK_ID") ?: return
        val taskTitle = intent.getStringExtra("TASK_TITLE") ?: "Task Reminder"
        val taskPriority = intent.getStringExtra("TASK_PRIORITY") ?: "MEDIUM"
        val taskDeadline = intent.getStringExtra("TASK_DEADLINE")

        Log.d(TAG, "Alarm triggered for task ID: $taskId")
        
        // Dynamic completion evaluation - hitting /api/reminders prevents local polling
        RetrofitClient.instance.getReminders().enqueue(object : Callback<ReminderResponse> {
            override fun onResponse(call: Call<ReminderResponse>, response: Response<ReminderResponse>) {
                if (response.isSuccessful) {
                    val reminders = response.body()?.reminders ?: emptyList()
                    val eligible = reminders.find { it.taskId == taskId }
                    if (eligible != null) {
                        showNotification(context, taskId, taskTitle, taskPriority, taskDeadline)
                    } else {
                        Log.d(TAG, "Task $taskId is no longer present in reminders list. Cancelled implicitly.")
                    }
                }
            }
            override fun onFailure(call: Call<ReminderResponse>, t: Throwable) {
                Log.e(TAG, "Failed resolving reminders for $taskId", t)
            }
        })
    }

    private fun showNotification(context: Context, taskId: String, title: String, priority: String, deadline: String?) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(CHANNEL_ID, "Task Reminders", NotificationManager.IMPORTANCE_HIGH)
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && 
            ActivityCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "Notification permission missing.")
            return
        }

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            context, taskId.hashCode(), intent, 
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("\u23F0 Task Due Soon")
            .setContentText(title)
            .setStyle(NotificationCompat.BigTextStyle().bigText("$title\nPriority: $priority\nDeadline: ${formatDateSafely(deadline)}"))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)

        NotificationManagerCompat.from(context).notify(taskId.hashCode(), builder.build())
        
        // Inform backend
        RetrofitClient.instance.markReminderSent(taskId).enqueue(object : Callback<Any> {
            override fun onResponse(call: Call<Any>, response: Response<Any>) {}
            override fun onFailure(call: Call<Any>, t: Throwable) {}
        })
    }

    private fun formatDateSafely(dateStr: String?): String {
        if (dateStr == null) return "Not specified"
        try {
            val format = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.getDefault())
            format.timeZone = java.util.TimeZone.getTimeZone("UTC")
            val d = format.parse(dateStr) ?: return dateStr
            
            val outFormat = java.text.SimpleDateFormat("MMM dd, yyyy HH:mm", java.util.Locale.getDefault())
            return outFormat.format(d)
        } catch(e: Exception) {
            return dateStr
        }
    }
}
