package com.example.whatsapptaskmanager

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.example.whatsapptaskmanager.api.RetrofitClient
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class NotificationActionReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "NotifActionReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        val taskId = intent.getStringExtra("TASK_ID") ?: return

        Log.d(TAG, "Received action: $action for task: $taskId")

        when (action) {
            "MARK_COMPLETE" -> {
                markTaskComplete(context, taskId)
            }
        }
    }

    private fun markTaskComplete(context: Context, taskId: String) {
        val updateMap = mapOf("status" to "COMPLETED")
        RetrofitClient.instance.updateTask(taskId, updateMap).enqueue(object : Callback<Any> {
            override fun onResponse(call: Call<Any>, response: Response<Any>) {
                if (response.isSuccessful) {
                    Log.d(TAG, "Task $taskId marked complete successfully")
                    // Cancel notifications for this task
                    val notificationManager = Chat2TaskNotificationManager(context)
                    notificationManager.cancelTaskNotifications(taskId)
                } else {
                    Log.e(TAG, "Failed to mark task complete: ${response.code()}")
                }
            }

            override fun onFailure(call: Call<Any>, t: Throwable) {
                Log.e(TAG, "Error calling updateTask", t)
            }
        })
    }
}
