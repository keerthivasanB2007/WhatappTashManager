package com.example.whatsapptaskmanager

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class MonitorStatus {
    IDLE,
    NOTIFICATION_RECEIVED,
    EXTRACTING,
    EXTRACTED,
    SENDING,
    SENT,
    PROCESSING,
    SUCCESS,
    NO_TASK,
    FAILED,
    DISCONNECTED,
    LISTENER_CONNECTED
}

data class DebugInfo(
    val status: MonitorStatus = MonitorStatus.IDLE,
    val sender: String? = null,
    val message: String? = null,
    val timestamp: String? = null,
    val error: String? = null,
    val httpStatus: Int? = null,
    val backendResponse: String? = null,
    val lastUpdated: String? = null
)

object DebugStatusManager {
    private const val PREF_NAME = "debug_status_prefs"
    private lateinit var prefs: SharedPreferences

    private val _debugInfo = MutableStateFlow(DebugInfo())
    val debugInfo: StateFlow<DebugInfo> = _debugInfo.asStateFlow()

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        // Optionally load last state from prefs if persistence is desired
    }

    fun updateStatus(status: MonitorStatus, 
                     sender: String? = _debugInfo.value.sender,
                     message: String? = _debugInfo.value.message,
                     timestamp: String? = _debugInfo.value.timestamp,
                     error: String? = null,
                     httpStatus: Int? = null,
                     backendResponse: String? = null) {
        
        val now = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())
        
        val newInfo = DebugInfo(
            status = status,
            sender = sender,
            message = message,
            timestamp = timestamp,
            error = error,
            httpStatus = httpStatus,
            backendResponse = backendResponse,
            lastUpdated = now
        )
        _debugInfo.value = newInfo
    }

    fun clearStatus() {
        _debugInfo.value = DebugInfo(status = MonitorStatus.IDLE)
    }
}
