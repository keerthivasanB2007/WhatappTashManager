package com.example.whatsapptaskmanager

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.example.whatsapptaskmanager.api.RetrofitClient
import com.example.whatsapptaskmanager.api.TasksResponse
import com.example.whatsapptaskmanager.api.TaskData
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class AlarmReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "AlarmReceiver"
        private const val ACTION_DAILY_SUMMARY = "com.example.whatsapptaskmanager.DAILY_SUMMARY"
        private const val ACTION_DEADLINE = "com.example.whatsapptaskmanager.DEADLINE"
        private const val ACTION_OVERDUE = "com.example.whatsapptaskmanager.OVERDUE"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "Alarm triggered with action: $action")

        when (action) {
            ACTION_DAILY_SUMMARY -> {
                val summaryId = intent.getIntExtra("SUMMARY_ID", Chat2TaskNotificationManager.ID_MORNING)
                handleDailySummary(context, summaryId)
                // Reschedule for next day
                TaskScheduler.scheduleDailyReminders(context)
            }
            ACTION_DEADLINE -> {
                val taskId = intent.getStringExtra("TASK_ID") ?: return
                verifyAndShowDeadline(context, taskId)
            }
            ACTION_OVERDUE -> {
                val taskId = intent.getStringExtra("TASK_ID") ?: return
                verifyAndShowOverdue(context, taskId)
            }
        }
    }

    private fun handleDailySummary(context: Context, summaryId: Int) {
        RetrofitClient.instance.getTasks().enqueue(object : Callback<TasksResponse> {
            override fun onResponse(call: Call<TasksResponse>, response: Response<TasksResponse>) {
                if (response.isSuccessful) {
                    val tasks = response.body()?.tasks ?: emptyList()
                    val pendingTasks = tasks.filter { it.status?.equals("PENDING", ignoreCase = true) == true }
                    
                    val now = System.currentTimeMillis()
                    val overdueCount = pendingTasks.count { isOverdue(it.deadline, now) }
                    val importantCount = pendingTasks.count { it.priority?.equals("HIGH", ignoreCase = true) == true || it.priority?.equals("URGENT", ignoreCase = true) == true }
                    
                    val title: String
                    val content: String
                    val bigText: StringBuilder = StringBuilder()

                    when (summaryId) {
                        Chat2TaskNotificationManager.ID_MORNING -> {
                            title = "Chat2Task \u2014 Good Morning"
                            content = "${pendingTasks.size} tasks today \u2022 $importantCount important \u2022 $overdueCount overdue"
                            bigText.append("Today's Tasks\n\n")
                        }
                        Chat2TaskNotificationManager.ID_EVENING -> {
                            title = "Chat2Task \u2014 Evening Reminder"
                            content = "${pendingTasks.size} tasks are still pending today."
                            bigText.append("Today's Progress\n\n")
                            val completedCount = tasks.count { it.status?.equals("COMPLETED", ignoreCase = true) == true }
                            bigText.append("\u2705 $completedCount completed\n")
                        }
                        else -> {
                            title = "Chat2Task \u2014 Final Check"
                            content = "${pendingTasks.size} tasks are still pending today."
                            bigText.append("Before you finish your day\n\n")
                        }
                    }

                    bigText.append("\ud83d\udd34 $overdueCount overdue\n")
                    bigText.append("\ud83d\udfe2 $importantCount important\n")
                    bigText.append("\ud83d\udd35 ${pendingTasks.size - overdueCount - importantCount} normal\n\n")

                    if (pendingTasks.isEmpty()) {
                        val emptyContent = "Your day is clear. No tasks scheduled for today."
                        Chat2TaskNotificationManager(context).showDailySummary(summaryId, title, emptyContent, emptyContent)
                    } else {
                        bigText.append("Priority tasks:\n")
                        pendingTasks.take(5).forEach { 
                            bigText.append("\u2022 ${it.task ?: "Task"} \u2014 ${it.deadline ?: "No deadline"}\n")
                        }
                        Chat2TaskNotificationManager(context).showDailySummary(summaryId, title, content, bigText.toString())
                    }
                }
            }
            override fun onFailure(call: Call<TasksResponse>, t: Throwable) {
                Log.e(TAG, "Failed fetching tasks for summary", t)
            }
        })
    }

    private fun verifyAndShowDeadline(context: Context, taskId: String) {
        verifyTaskStatus(taskId) { task ->
            if (task.status?.equals("PENDING", ignoreCase = true) == true) {
                Chat2TaskNotificationManager(context).showDeadlineReminder(task)
            }
        }
    }

    private fun verifyAndShowOverdue(context: Context, taskId: String) {
        verifyTaskStatus(taskId) { task ->
            if (task.status?.equals("PENDING", ignoreCase = true) == true) {
                Chat2TaskNotificationManager(context).showOverdueNotification(task)
            }
        }
    }

    private fun verifyTaskStatus(taskId: String, onVerified: (TaskData) -> Unit) {
        RetrofitClient.instance.getTasks().enqueue(object : Callback<TasksResponse> {
            override fun onResponse(call: Call<TasksResponse>, response: Response<TasksResponse>) {
                if (response.isSuccessful) {
                    val task = response.body()?.tasks?.find { it.id == taskId }
                    if (task != null) {
                        onVerified(task)
                    }
                }
            }
            override fun onFailure(call: Call<TasksResponse>, t: Throwable) {}
        })
    }

    private fun isOverdue(deadlineStr: String?, now: Long): Boolean {
        if (deadlineStr == null) return false
        val format = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.getDefault())
        format.timeZone = java.util.TimeZone.getTimeZone("UTC")
        return try {
            val date = format.parse(deadlineStr)
            date != null && date.time < now
        } catch (e: Exception) {
            false
        }
    }
}
