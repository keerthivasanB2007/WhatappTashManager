package com.example.whatsapptaskmanager.api

import com.example.whatsapptaskmanager.BuildConfig
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitClient {
    private val BASE_URL = BuildConfig.BACKEND_URL

    fun getBaseUrl(): String = BASE_URL

    val instance: WhatsAppApi by lazy {
        val retrofit = Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
        retrofit.create(WhatsAppApi::class.java)
    }
}
