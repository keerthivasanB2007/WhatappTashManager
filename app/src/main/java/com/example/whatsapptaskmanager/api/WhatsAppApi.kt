package com.example.whatsapptaskmanager.api

import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PATCH
import retrofit2.http.Path

data class ReminderResponse(val success: Boolean, val reminders: List<ReminderTask>? = null)
data class ReminderTask(val taskId: String, val title: String, val deadline: String?, val priority: String?, val message: String)

data class TokensData(val accessToken: String, val refreshToken: String?)
data class LoginResponse(val success: Boolean, val message: String, val tokens: TokensData?)
data class RefreshResponse(val success: Boolean, val message: String, val tokens: TokensData?)


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
    val sender: String? = null,
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

data class TasksResponse(
    val success: Boolean,
    val count: Int,
    val tasks: List<TaskData>
)

data class HealthResponse(val status: String)

interface WhatsAppApi {
    @POST("api/auth/login")
    fun login(@Body body: Map<String, String>): Call<LoginResponse>

    @POST("api/auth/refresh")
    fun refresh(@retrofit2.http.Header("Cookie") cookie: String): Call<RefreshResponse> // fallback 

    @POST("api/messages")
    fun sendMessage(@Body request: MessageRequest): Call<MessageResponse>

    @GET("api/reminders")
    fun getReminders(): Call<ReminderResponse>

    @POST("api/reminders/{taskId}/sent")
    fun markReminderSent(@Path("taskId") taskId: String): Call<Any>

    @GET("api/tasks")
    fun getTasks(): Call<TasksResponse>

    @PATCH("api/tasks/{id}")
    fun updateTask(@Path("id") id: String, @Body body: Map<String, String>): Call<Any>

    @GET("health")
    fun checkHealth(): Call<HealthResponse>
}
