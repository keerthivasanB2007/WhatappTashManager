package com.example.whatsapptaskmanager.api

import com.example.whatsapptaskmanager.BuildConfig
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {
    private val BASE_URL = BuildConfig.BACKEND_URL

    fun getBaseUrl(): String = BASE_URL

    private val authInterceptor = Interceptor { chain ->
        val originalRequest = chain.request()
        
        val accessToken = AuthManager.getAccessToken()
        if (accessToken != null) {
            val newRequest = originalRequest.newBuilder()
                .header("Authorization", "Bearer $accessToken")
                .build()
            chain.proceed(newRequest)
        } else {
            chain.proceed(originalRequest)
        }
    }

    private val authenticator = object : okhttp3.Authenticator {
        override fun authenticate(route: Route?, response: Response): Request? {
            // Avoid infinite loops if refresh fails
            if (response.request().url().encodedPath().contains("api/auth/refresh")) {
                return null
            }
            
            val refreshToken = AuthManager.getRefreshToken() ?: return null

            synchronized(this) {
                // Check if another thread already refreshed
                val currentToken = AuthManager.getAccessToken()
                val previousToken = response.request().header("Authorization")?.removePrefix("Bearer ")

                if (currentToken != null && currentToken != previousToken) {
                    return response.request().newBuilder()
                        .header("Authorization", "Bearer $currentToken")
                        .build()
                }

                // Call refresh synchronously with the existing retrofit instance? 
                // To avoid circular dependency, we use a custom lightweight OkHttp call or the specific endpoint.
                try {
                    val fallbackClient = OkHttpClient.Builder().build()
                    val refreshRequest = Request.Builder()
                        .url("${BASE_URL}api/auth/refresh")
                        .post(okhttp3.RequestBody.create(null, ByteArray(0)))
                        .header("Cookie", "refreshToken=$refreshToken") // Required for /api/auth/refresh CSRF bypass (web expects refresh cookie)
                        .header("X-Requested-With", "XMLHttpRequest") // Required by backend CSRF check
                        .build()

                    val res = fallbackClient.newCall(refreshRequest).execute()
                    if (res.isSuccessful) {
                        val body = res.body()?.string()
                        val gson = com.google.gson.Gson()
                        val refreshResponse = gson.fromJson(body, RefreshResponse::class.java)
                        
                        var newAccessToken = refreshResponse.tokens?.accessToken
                        
                        if (newAccessToken == null) {
                            val cookies = res.headers("Set-Cookie")
                            for (cookie in cookies) {
                                if (cookie.contains("accessToken=")) {
                                    newAccessToken = cookie.substringAfter("accessToken=").substringBefore(";")
                                    break
                                }
                            }
                        }

                        if (newAccessToken != null) {
                            AuthManager.saveAccessToken(newAccessToken)
                            return response.request().newBuilder()
                                .removeHeader("Authorization")
                                .header("Authorization", "Bearer $newAccessToken")
                                .build()
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
                
                // Refresh failed, clear tokens
                AuthManager.clearTokens()
                return null
            }
        }
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .authenticator(authenticator)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    val instance: WhatsAppApi by lazy {
        val retrofit = Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
        retrofit.create(WhatsAppApi::class.java)
    }
}
