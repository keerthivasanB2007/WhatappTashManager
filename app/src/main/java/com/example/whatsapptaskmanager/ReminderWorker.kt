package com.example.whatsapptaskmanager

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.example.whatsapptaskmanager.api.RetrofitClient

class ReminderWorker(appContext: Context, workerParams: WorkerParameters) :
    CoroutineWorker(appContext, workerParams) {

    companion object {
        private const val TAG = "ReminderWorker"
        private const val CHANNEL_ID = "task_reminders"
    }

    override suspend fun doWork(): Result {
        return try {
            Log.d(TAG, "ReminderWorker: STARTED")
            Log.d(TAG, "ReminderWorker: Calling /api/reminders at ${RetrofitClient.getBaseUrl()}")
            
            val response = RetrofitClient.instance.getReminders().execute()
            if (response.isSuccessful) {
                val reminderResponse = response.body()
                val reminders = reminderResponse?.reminders
                
                if (reminders.isNullOrEmpty()) {
                    Log.d(TAG, "ReminderWorker: No pending reminders received")
                    return Result.success()
                }

                Log.d(TAG, "ReminderWorker: Received ${reminders.size} reminders")
                checkNotificationChannel()

                for (reminder in reminders) {
                    Log.d(TAG, "ReminderWorker: Processing reminder ID=${reminder.taskId}")
                    
                    if (ActivityCompat.checkSelfPermission(applicationContext, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED || Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
                        
                        val intent = Intent(applicationContext, MainActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        }
                        val pendingIntent: PendingIntent = PendingIntent.getActivity(
                            applicationContext, 
                            reminder.taskId.hashCode(), 
                            intent, 
                            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                        )
                        
                        Log.d(TAG, "ReminderWorker: Creating notification for ${reminder.title}")
                        val builder = NotificationCompat.Builder(applicationContext, CHANNEL_ID)
                            .setSmallIcon(R.mipmap.ic_launcher)
                            .setContentTitle("\u23F0 Task Due Soon")
                            .setContentText(reminder.title)
                            .setStyle(NotificationCompat.BigTextStyle()
                                .bigText("Priority: ${reminder.priority ?: "NORMAL"}\nDue: ${reminder.deadline ?: "Unknown"}"))
                            .setPriority(NotificationCompat.PRIORITY_HIGH)
                            .setContentIntent(pendingIntent)
                            .setAutoCancel(true)

                        try {
                            NotificationManagerCompat.from(applicationContext).notify(reminder.taskId.hashCode(), builder.build())
                            Log.d(TAG, "ReminderWorker: Notification posted")

                            Log.d(TAG, "ReminderWorker: Marking reminder as sent ID=${reminder.taskId}")
                            val markSentResponse = RetrofitClient.instance.markReminderSent(reminder.taskId).execute()
                            if (markSentResponse.isSuccessful) {
                                Log.d(TAG, "ReminderWorker: Reminder marked as sent successfully")
                            } else {
                                Log.e(TAG, "ReminderWorker: Failed to mark reminder as sent. HTTP ${markSentResponse.code()}")
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "ReminderWorker: Error during notification/mark-sent for ID=${reminder.taskId}", e)
                        }
                    } else {
                        Log.w(TAG, "ReminderWorker: POST_NOTIFICATIONS permission missing")
                    }
                }
                Log.d(TAG, "ReminderWorker: SUCCESS")
                Result.success()
            } else {
                Log.e(TAG, "ReminderWorker: HTTP ERROR ${response.code()}")
                Result.retry()
            }
        } catch (e: java.io.IOException) {
            Log.e(TAG, "ReminderWorker: NETWORK ERROR (is backend running at ${RetrofitClient.getBaseUrl()}?)", e)
            Result.retry()
        } catch (e: Exception) {
            Log.e(TAG, "ReminderWorker: EXCEPTION", e)
            Result.failure()
        }
    }

    private fun checkNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Task Reminders"
            val descriptionText = "Notifications for upcoming task deadlines"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
            }
            val notificationManager: NotificationManager =
                applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
}
