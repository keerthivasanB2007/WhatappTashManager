package com.example.whatsapptaskmanager

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.example.whatsapptaskmanager.api.RetrofitClient
import com.example.whatsapptaskmanager.api.TasksResponse
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class BootReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.d(TAG, "Device rebooted. Rescheduling all reminders...")
            
            // Re-initialize notification channels
            Chat2TaskNotificationManager(context).createNotificationChannels()
            
            // Reschedule daily summaries
            TaskScheduler.scheduleDailyReminders(context)
            
            // Fetch tasks from backend to reschedule deadline/overdue alarms
            rescheduleTaskAlarms(context)
        }
    }

    private fun rescheduleTaskAlarms(context: Context) {
        RetrofitClient.instance.getTasks().enqueue(object : Callback<TasksResponse> {
            override fun onResponse(call: Call<TasksResponse>, response: Response<TasksResponse>) {
                if (response.isSuccessful) {
                    val tasks = response.body()?.tasks ?: emptyList()
                    Log.d(TAG, "Fetched ${tasks.size} tasks for rescheduling")
                    tasks.forEach { task ->
                        if (task.status?.equals("PENDING", ignoreCase = true) == true) {
                            TaskScheduler.scheduleTaskReminders(context, task)
                        }
                    }
                }
            }

            override fun onFailure(call: Call<TasksResponse>, t: Throwable) {
                Log.e(TAG, "Failed to fetch tasks for rescheduling", t)
            }
        })
    }
}
