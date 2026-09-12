package com.example.whatsapptaskmanager

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.example.whatsapptaskmanager.api.TaskData
import java.text.SimpleDateFormat
import java.util.*

object TaskScheduler {
    private const val TAG = "TaskScheduler"

    const val MORNING_REMINDER_HOUR = 8
    const val MORNING_REMINDER_MINUTE = 0

    const val EVENING_REMINDER_HOUR = 18
    const val EVENING_REMINDER_MINUTE = 0

    const val NIGHT_REMINDER_HOUR = 21
    const val NIGHT_REMINDER_MINUTE = 30

    private const val ACTION_DAILY_SUMMARY = "com.example.whatsapptaskmanager.DAILY_SUMMARY"
    private const val ACTION_DEADLINE = "com.example.whatsapptaskmanager.DEADLINE"
    private const val ACTION_OVERDUE = "com.example.whatsapptaskmanager.OVERDUE"

    fun scheduleDailyReminders(context: Context) {
        scheduleDaily(context, MORNING_REMINDER_HOUR, MORNING_REMINDER_MINUTE, Chat2TaskNotificationManager.ID_MORNING)
        scheduleDaily(context, EVENING_REMINDER_HOUR, EVENING_REMINDER_MINUTE, Chat2TaskNotificationManager.ID_EVENING)
        scheduleDaily(context, NIGHT_REMINDER_HOUR, NIGHT_REMINDER_MINUTE, Chat2TaskNotificationManager.ID_NIGHT)
    }

    private fun scheduleDaily(context: Context, hour: Int, minute: Int, id: Int) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = ACTION_DAILY_SUMMARY
            putExtra("SUMMARY_ID", id)
        }
        val pendingIntent = PendingIntent.getBroadcast(context, id, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

        val calendar = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            if (before(Calendar.getInstance())) {
                add(Calendar.DAY_OF_YEAR, 1)
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, calendar.timeInMillis, pendingIntent)
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, calendar.timeInMillis, pendingIntent)
        }
        Log.d(TAG, "Scheduled daily summary $id for ${calendar.time}")
    }

    fun scheduleTaskReminders(context: Context, task: TaskData) {
        if (task.status?.equals("COMPLETED", ignoreCase = true) == true) {
            cancelTaskAlarms(context, task.id)
            return
        }
        
        val deadline = parseDeadline(task.deadline) ?: return
        val now = System.currentTimeMillis()

        // 1 Hour Before Reminder
        val oneHourBefore = deadline.time - (60 * 60 * 1000)
        if (oneHourBefore > now) {
            scheduleAlarm(context, task, oneHourBefore, ACTION_DEADLINE, task.id.hashCode() + Chat2TaskNotificationManager.OFFSET_DEADLINE)
        }

        // Overdue Reminder (at exactly deadline)
        if (deadline.time > now) {
            scheduleAlarm(context, task, deadline.time, ACTION_OVERDUE, task.id.hashCode() + Chat2TaskNotificationManager.OFFSET_OVERDUE)
        }
    }

    private fun scheduleAlarm(context: Context, task: TaskData, time: Long, actionStr: String, id: Int) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = actionStr
            putExtra("TASK_ID", task.id)
            putExtra("TASK_TITLE", task.task ?: task.originalMessage)
            putExtra("TASK_SENDER", task.sender)
            putExtra("TASK_DEADLINE", task.deadline)
            putExtra("TASK_PRIORITY", task.priority)
            putExtra("TASK_ORIGINAL", task.originalMessage)
        }
        val pendingIntent = PendingIntent.getBroadcast(context, id, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, time, pendingIntent)
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, time, pendingIntent)
        }
        Log.d(TAG, "Scheduled $actionStr for task ${task.id} at ${Date(time)}")
    }

    private fun cancelTaskAlarms(context: Context, taskId: String) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        
        val deadlineIntent = Intent(context, AlarmReceiver::class.java).apply { action = ACTION_DEADLINE }
        val deadlinePI = PendingIntent.getBroadcast(context, taskId.hashCode() + Chat2TaskNotificationManager.OFFSET_DEADLINE, deadlineIntent, PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE)
        deadlinePI?.let { alarmManager.cancel(it) }

        val overdueIntent = Intent(context, AlarmReceiver::class.java).apply { action = ACTION_OVERDUE }
        val overduePI = PendingIntent.getBroadcast(context, taskId.hashCode() + Chat2TaskNotificationManager.OFFSET_OVERDUE, overdueIntent, PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE)
        overduePI?.let { alarmManager.cancel(it) }
        
        Log.d(TAG, "Cancelled alarms for task $taskId")
    }

    private fun parseDeadline(deadlineStr: String?): Date? {
        if (deadlineStr == null) return null
        return try {
            val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
            format.timeZone = TimeZone.getTimeZone("UTC")
            format.parse(deadlineStr)
        } catch (e: Exception) {
            try {
                // Fallback for missing Z or different format
                val format2 = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                format2.parse(deadlineStr)
            } catch (e2: Exception) {
                null
            }
        }
    }
}
