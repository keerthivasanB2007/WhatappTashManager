package com.example.whatsapptaskmanager

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.util.Log
import com.example.whatsapptaskmanager.api.TaskData
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object AlarmScheduler {
    private const val TAG = "AlarmScheduler"

    fun scheduleAlarm(context: Context, task: TaskData) {
        if (task.deadline == null) return
        try {
            val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
            format.timeZone = java.util.TimeZone.getTimeZone("UTC")
            val deadlineDate = format.parse(task.deadline) ?: return
            
            val dTime = deadlineDate.time
            var offsetHours = 2L
            if (task.priority?.equals("HIGH", ignoreCase = true) == true) offsetHours = 1L
            else if (task.priority?.equals("LOW", ignoreCase = true) == true) offsetHours = 3L
            
            val reminderTime = dTime - (offsetHours * 60 * 60 * 1000)
            if (reminderTime <= System.currentTimeMillis()) {
                Log.d(TAG, "Ignoring alarm for ${task.id}: time is in the past.")
                return
            }

            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(context, AlarmReceiver::class.java).apply {
                putExtra("TASK_ID", task.id)
                putExtra("TASK_TITLE", task.task ?: task.originalMessage)
                putExtra("TASK_PRIORITY", task.priority ?: "MEDIUM")
                putExtra("TASK_DEADLINE", task.deadline)
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                task.id.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            try {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, reminderTime, pendingIntent)
                Log.d(TAG, "Alarm set for ${task.id} at ${Date(reminderTime)}")
            } catch(e: SecurityException) {
                Log.e(TAG, "SecurityException: Cannot set exact alarm", e)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing deadline for ${task.id}", e)
        }
    }
}
