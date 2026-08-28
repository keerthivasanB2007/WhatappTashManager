package com.example.whatsapptaskmanager.api

import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

data class ReminderResponse(val success: Boolean, val reminders: List<ReminderTask>? = null)
data class ReminderTask(val taskId: String, val title: String, val deadline: String?, val priority: String?, val message: String)

interface WhatsAppApi {
    @POST("api/messages")
    fun sendMessage(@Body request: MessageRequest): Call<Any>

    @GET("api/reminders")
    fun getReminders(): Call<ReminderResponse>

    @POST("api/reminders/{taskId}/sent")
    fun markReminderSent(@Path("taskId") taskId: String): Call<Any>
}
