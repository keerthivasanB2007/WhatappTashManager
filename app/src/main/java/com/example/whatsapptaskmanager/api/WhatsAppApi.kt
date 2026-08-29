package com.example.whatsapptaskmanager.api

import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

data class ReminderResponse(val success: Boolean, val reminders: List<ReminderTask>? = null)
data class ReminderTask(val taskId: String, val title: String, val deadline: String?, val priority: String?, val message: String)

data class Classification(
    val isImportant: Boolean,
    val isTask: Boolean,
    val category: String?,
    val task: String?,
    val deadline: String?,
    val priority: String?
)

data class TaskData(
    val id: String,
    val task: String?,
    val originalMessage: String,
    val deadline: String?,
    val priority: String?,
    val status: String?
)

data class MessageResponse(
    val success: Boolean,
    val message: String?,
    val classification: Classification?,
    val task: TaskData?
)

data class HealthResponse(val status: String)

interface WhatsAppApi {
    @POST("api/messages")
    fun sendMessage(@Body request: MessageRequest): Call<MessageResponse>

    @GET("api/reminders")
    fun getReminders(): Call<ReminderResponse>

    @POST("api/reminders/{taskId}/sent")
    fun markReminderSent(@Path("taskId") taskId: String): Call<Any>

    @GET("health")
    fun checkHealth(): Call<HealthResponse>
}
