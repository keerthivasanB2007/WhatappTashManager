package com.example.whatsapptaskmanager

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.example.whatsapptaskmanager.api.TaskData

class Chat2TaskNotificationManager(private val context: Context) {

    companion object {
        const val CHANNEL_DAILY = "daily_reminders"
        const val CHANNEL_IMPORTANT = "important_tasks"
        const val CHANNEL_DEADLINE = "deadline_reminders"
        const val CHANNEL_OVERDUE = "overdue_tasks"

        private const val TAG = "Chat2TaskNotifManager"

        const val ID_MORNING = 1001
        const val ID_EVENING = 1002
        const val ID_NIGHT = 1003
        
        const val OFFSET_DEADLINE = 2000
        const val OFFSET_OVERDUE = 4000
        const val OFFSET_IMPORTANT = 6000
    }

    fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channels = listOf(
                NotificationChannel(CHANNEL_DAILY, "Daily Reminders", NotificationManager.IMPORTANCE_DEFAULT).apply {
                    description = "Summary of tasks for the day"
                },
                NotificationChannel(CHANNEL_IMPORTANT, "Important Tasks", NotificationManager.IMPORTANCE_HIGH).apply {
                    description = "Immediate notifications for high priority tasks"
                },
                NotificationChannel(CHANNEL_DEADLINE, "Deadline Reminders", NotificationManager.IMPORTANCE_HIGH).apply {
                    description = "Reminders 1 hour before task deadlines"
                },
                NotificationChannel(CHANNEL_OVERDUE, "Overdue Tasks", NotificationManager.IMPORTANCE_HIGH).apply {
                    description = "Alerts for tasks that have passed their deadline"
                }
            )
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannels(channels)
        }
    }

    fun showImportantTaskNotification(task: TaskData) {
        val title = if (task.priority?.equals("URGENT", ignoreCase = true) == true) {
            "Chat2Task \u2014 Urgent Task"
        } else {
            "Chat2Task \u2014 Important Task"
        }

        val url = extractUrl(task.originalMessage)
        val builder = buildTaskNotification(task, CHANNEL_IMPORTANT, title, url)
        notify(task.id.hashCode() + OFFSET_IMPORTANT, builder.build())
    }

    fun showDeadlineReminder(task: TaskData) {
        val url = extractUrl(task.originalMessage)
        val builder = buildTaskNotification(task, CHANNEL_DEADLINE, "Chat2Task \u2014 Due in 1 Hour", url)
        builder.setSubText("1 hour remaining")
        notify(task.id.hashCode() + OFFSET_DEADLINE, builder.build())
    }

    fun showOverdueNotification(task: TaskData) {
        val url = extractUrl(task.originalMessage)
        val builder = buildTaskNotification(task, CHANNEL_OVERDUE, "Chat2Task \u2014 Task Overdue", url)
        builder.setContentText("${task.task ?: "Task"} is overdue.")
        notify(task.id.hashCode() + OFFSET_OVERDUE, builder.build())
    }

    fun showDailySummary(id: Int, title: String, content: String, bigText: String) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(context, id, intent, PendingIntent.FLAG_IMMUTABLE)

        val builder = NotificationCompat.Builder(context, CHANNEL_DAILY)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(content)
            .setStyle(NotificationCompat.BigTextStyle().bigText(bigText))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .addAction(0, "Open Chat2Task", pendingIntent)

        notify(id, builder.build())
    }

    private fun buildTaskNotification(task: TaskData, channelId: String, title: String, url: String?): NotificationCompat.Builder {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(context, task.id.hashCode(), intent, PendingIntent.FLAG_IMMUTABLE)

        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(task.task ?: task.originalMessage)
            .setStyle(NotificationCompat.BigTextStyle().bigText(
                "${task.task ?: "No title"}\n\nFrom: ${task.sender ?: "WhatsApp"}\nDue: ${task.deadline ?: "No deadline"}\nPriority: ${task.priority ?: "NORMAL"}\n\nOriginal: ${task.originalMessage}" +
                (if (url != null) "\n\n\ud83d\udd17 Link available" else "")
            ))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .addAction(0, "Open Task", pendingIntent)

        // Mark Complete Action
        val completeIntent = Intent(context, NotificationActionReceiver::class.java).apply {
            action = "MARK_COMPLETE"
            putExtra("TASK_ID", task.id)
        }
        val completePendingIntent = PendingIntent.getBroadcast(context, task.id.hashCode() + 1, completeIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        builder.addAction(0, "Mark Complete", completePendingIntent)

        // Open Link Action
        if (url != null) {
            try {
                val linkIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                val linkPendingIntent = PendingIntent.getActivity(context, task.id.hashCode() + 2, linkIntent, PendingIntent.FLAG_IMMUTABLE)
                builder.addAction(0, "Open Link", linkPendingIntent)
            } catch (e: Exception) {
                Log.e(TAG, "Error creating link intent", e)
            }
        }

        return builder
    }

    private fun notify(id: Int, notification: android.app.Notification) {
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED || Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            NotificationManagerCompat.from(context).notify(id, notification)
        } else {
            Log.w(TAG, "Missing POST_NOTIFICATIONS permission")
        }
    }

    private fun extractUrl(text: String): String? {
        val urlRegex = "(https?://[^\\s]+)".toRegex()
        return urlRegex.find(text)?.value
    }

    fun cancelTaskNotifications(taskId: String) {
        val manager = NotificationManagerCompat.from(context)
        manager.cancel(taskId.hashCode() + OFFSET_DEADLINE)
        manager.cancel(taskId.hashCode() + OFFSET_OVERDUE)
        manager.cancel(taskId.hashCode() + OFFSET_IMPORTANT)
    }
}
