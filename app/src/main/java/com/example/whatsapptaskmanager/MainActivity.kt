package com.example.whatsapptaskmanager

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.text.TextUtils
import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.whatsapptaskmanager.api.HealthResponse
import com.example.whatsapptaskmanager.api.RetrofitClient
import com.example.whatsapptaskmanager.ui.theme.WhatsAppTaskManagerTheme
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        
        DebugStatusManager.init(this)

        val requestPermissionLauncher = registerForActivityResult(
            ActivityResultContracts.RequestPermission()
        ) {}
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
        
        val workRequest = PeriodicWorkRequestBuilder<ReminderWorker>(15, TimeUnit.MINUTES).build()
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "TaskReminderWork",
            ExistingPeriodicWorkPolicy.KEEP,
            workRequest
        )

        setContent {
            WhatsAppTaskManagerTheme {
                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    MainScreen(modifier = Modifier.padding(innerPadding))
                }
            }
        }
    }
}

// --- Precision Minimalist Visual Constants ---
private val SurfaceWhite = Color(0xFFFFFFFF)
private val BackgroundGray = Color(0xFFF9FAFB)
private val BorderGray = Color(0xFFE5E7EB)
private val TextPrimary = Color(0xFF111827)
private val TextSecondary = Color(0xFF6B7280)
private val StatusSuccess = Color(0xFF10B981)
private val StatusError = Color(0xFFEF4444)
private val StatusWarning = Color(0xFFF59E0B)
private val PrimaryDark = Color(0xFF111827)

@Composable
fun MainScreen(modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier.fillMaxSize(),
        color = BackgroundGray
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.Start
        ) {
            Text(
                text = "WhatsApp Task Manager",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
            
            Spacer(modifier = Modifier.height(4.dp))
            
            Text(
                text = "Automatically capture actionable WhatsApp messages and turn them into organized tasks.",
                fontSize = 14.sp,
                color = TextSecondary,
                lineHeight = 20.sp
            )
            
            Spacer(modifier = Modifier.height(32.dp))
            
            Text(
                text = "CONNECTION",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = TextSecondary,
                letterSpacing = 1.sp
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            NotificationAccessSection()
            
            Spacer(modifier = Modifier.height(12.dp))
            
            BackendTestSection()

            Spacer(modifier = Modifier.height(32.dp))
            
            Text(
                text = "NOTIFICATION PROCESSING",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = TextSecondary,
                letterSpacing = 1.sp
            )
            
            Spacer(modifier = Modifier.height(12.dp))

            NotificationMonitorCard()
        }
    }
}

@Composable
fun NotificationAccessSection() {
    val context = LocalContext.current
    var isEnabled by remember { mutableStateOf(isNotificationServiceEnabled(context)) }

    LaunchedEffect(Unit) {
        while(true) {
            isEnabled = isNotificationServiceEnabled(context)
            kotlinx.coroutines.delay(2000)
        }
    }

    PrecisionCard {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(
                    text = "Notification Access",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        modifier = Modifier.size(8.dp),
                        shape = androidx.compose.foundation.shape.CircleShape,
                        color = if (isEnabled) StatusSuccess else StatusError
                    ) {}
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (isEnabled) "Connected" else "Not Connected",
                        fontSize = 12.sp,
                        color = TextSecondary
                    )
                }
            }
            
            OutlinedButton(
                onClick = { context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)) },
                colors = ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
                border = androidx.compose.foundation.BorderStroke(1.dp, BorderGray),
                shape = androidx.compose.foundation.shape.RoundedCornerShape(6.dp),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Text("Settings", fontSize = 12.sp, fontWeight = FontWeight.Medium)
            }
        }
    }
}

@Composable
fun BackendTestSection() {
    var testResult by remember { mutableStateOf<String?>(null) }
    var isTesting by remember { mutableStateOf(false) }

    PrecisionCard {
        Column(modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)) {
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = "Backend",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            modifier = Modifier.size(8.dp),
                            shape = androidx.compose.foundation.shape.CircleShape,
                            color = if (testResult?.contains("SUCCESS") == true) StatusSuccess else if (testResult == null) Color.LightGray else StatusError
                        ) {}
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (testResult?.contains("SUCCESS") == true) "Connected" else if (testResult == null) "Unknown" else "Error",
                            fontSize = 12.sp,
                            color = TextSecondary
                        )
                    }
                }
                
                Button(
                    onClick = {
                        isTesting = true
                        testResult = "Testing..."
                        RetrofitClient.instance.checkHealth().enqueue(object : Callback<HealthResponse> {
                            override fun onResponse(call: Call<HealthResponse>, response: Response<HealthResponse>) {
                                isTesting = false
                                if (response.isSuccessful) {
                                    testResult = "Backend Connection: SUCCESS\nHTTP Status: ${response.code()}"
                                } else {
                                    testResult = "Backend Connection: FAILED\nHTTP Status: ${response.code()}"
                                }
                            }

                            override fun onFailure(call: Call<HealthResponse>, t: Throwable) {
                                isTesting = false
                                testResult = "Backend Connection: FAILED\nError: ${t.message}"
                            }
                        })
                    },
                    enabled = !isTesting,
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryDark, contentColor = SurfaceWhite),
                    shape = androidx.compose.foundation.shape.RoundedCornerShape(6.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(if (isTesting) "Testing..." else "Test Connection", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                }
            }
            
            if (testResult != null && !isTesting) {
                Spacer(modifier = Modifier.height(12.dp))
                Surface(
                    color = BackgroundGray,
                    shape = androidx.compose.foundation.shape.RoundedCornerShape(4.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, BorderGray)
                ) {
                    Text(
                        text = testResult!!,
                        fontSize = 11.sp,
                        color = TextSecondary,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(8.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun NotificationMonitorCard() {
    val debugInfo by DebugStatusManager.debugInfo.collectAsState()
    
    PrecisionCard {
        Column(modifier = Modifier.padding(16.dp)) {
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Current Status",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary
                )
                
                Surface(
                    color = getStatusColor(debugInfo.status).copy(alpha = 0.1f),
                    shape = androidx.compose.foundation.shape.RoundedCornerShape(4.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, getStatusColor(debugInfo.status).copy(alpha = 0.3f))
                ) {
                    Text(
                        text = debugInfo.status.name,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = getStatusColor(debugInfo.status),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Vertical timeline representation of processing
            TimelineStep("Waiting for notifications", debugInfo.status == MonitorStatus.IDLE)
            TimelineStep("Notification received", debugInfo.status == MonitorStatus.NOTIFICATION_RECEIVED)
            TimelineStep("Extracting message", debugInfo.status == MonitorStatus.EXTRACTING || debugInfo.status == MonitorStatus.EXTRACTED)
            TimelineStep("Sending to backend", debugInfo.status == MonitorStatus.SENDING || debugInfo.status == MonitorStatus.SENT)
            TimelineStep("Backend resolution", debugInfo.status == MonitorStatus.SUCCESS || debugInfo.status == MonitorStatus.NO_TASK || debugInfo.status == MonitorStatus.FAILED, isLast = true)
            
            HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp), color = BorderGray)
            
            // Extracted Information
            Text("Latest Extracted Details", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextSecondary, letterSpacing = 1.sp)
            Spacer(modifier = Modifier.height(12.dp))
            
            MonitorRow("Sender", debugInfo.sender ?: "—")
            MonitorRow("Time", debugInfo.timestamp ?: "—")
            MonitorRow("Message", debugInfo.message ?: "—", isMessage = true)
            
            Spacer(modifier = Modifier.height(16.dp))
            Text("Network Details", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextSecondary, letterSpacing = 1.sp)
            Spacer(modifier = Modifier.height(12.dp))
            
            MonitorRow("Target", RetrofitClient.getBaseUrl())
            MonitorRow("HTTP Status", debugInfo.httpStatus?.toString() ?: "—")
            
            if (debugInfo.error != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Surface(
                    color = Color(0xFFFEF2F2),
                    shape = androidx.compose.foundation.shape.RoundedCornerShape(4.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFECACA))
                ) {
                    Column(modifier = Modifier.padding(8.dp).fillMaxWidth()) {
                        Text("Exception Raised", color = StatusError, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        Text(debugInfo.error!!, color = Color(0xFF991B1B), fontSize = 11.sp, modifier = Modifier.padding(top = 4.dp))
                    }
                }
            }
        }
    }
    
    Spacer(modifier = Modifier.height(24.dp))
    
    Text(
        text = "DIAGNOSTIC ACTIONS",
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        color = TextSecondary,
        letterSpacing = 1.sp
    )
    
    Spacer(modifier = Modifier.height(12.dp))
    
    OutlinedButton(
        onClick = { DebugStatusManager.clearStatus() },
        modifier = Modifier.fillMaxWidth(),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
        border = androidx.compose.foundation.BorderStroke(1.dp, BorderGray),
        shape = androidx.compose.foundation.shape.RoundedCornerShape(6.dp)
    ) {
        Text("Clear Monitor", fontSize = 13.sp, fontWeight = FontWeight.Medium)
    }
}

@Composable
fun TimelineStep(text: String, isActive: Boolean, isLast: Boolean = false) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(20.dp)) {
            Surface(
                modifier = Modifier.size(8.dp).padding(top = 2.dp),
                shape = androidx.compose.foundation.shape.CircleShape,
                color = if (isActive) PrimaryDark else BorderGray
            ) {}
            if (!isLast) {
                Surface(
                    modifier = Modifier.width(2.dp).height(20.dp).padding(vertical = 4.dp),
                    color = if (isActive) BorderGray else BorderGray.copy(alpha = 0.5f)
                ) {}
            }
        }
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = text,
            fontSize = 13.sp,
            color = if (isActive) TextPrimary else TextSecondary,
            fontWeight = if (isActive) FontWeight.SemiBold else FontWeight.Normal,
            modifier = Modifier.padding(bottom = if (isLast) 0.dp else 12.dp)
        )
    }
}

@Composable
fun PrecisionCard(content: @Composable () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = androidx.compose.foundation.shape.RoundedCornerShape(8.dp),
        color = SurfaceWhite,
        border = androidx.compose.foundation.BorderStroke(1.dp, BorderGray),
        shadowElevation = 1.dp
    ) {
        content()
    }
}

@Composable
fun MonitorRow(label: String, value: String, isMessage: Boolean = false) {
    Column(modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)) {
        Text(text = label, color = TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.Medium)
        Spacer(modifier = Modifier.height(2.dp))
        if (isMessage && value != "—") {
            Surface(
                color = BackgroundGray,
                shape = androidx.compose.foundation.shape.RoundedCornerShape(4.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, BorderGray),
                modifier = Modifier.fillMaxWidth().padding(top = 4.dp)
            ) {
                Text(
                    text = value,
                    color = TextPrimary,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(10.dp),
                    lineHeight = 18.sp
                )
            }
        } else {
            Text(text = value, color = TextPrimary, fontSize = 13.sp)
        }
    }
}

fun getStatusColor(status: MonitorStatus): Color {
    return when (status) {
        MonitorStatus.IDLE -> TextSecondary
        MonitorStatus.NOTIFICATION_RECEIVED -> Color(0xFF2563EB)
        MonitorStatus.EXTRACTING, MonitorStatus.EXTRACTED -> Color(0xFF3B82F6)
        MonitorStatus.SENDING, MonitorStatus.SENT -> Color(0xFFF59E0B)
        MonitorStatus.PROCESSING -> Color(0xFF8B5CF6)
        MonitorStatus.SUCCESS, MonitorStatus.NO_TASK, MonitorStatus.LISTENER_CONNECTED -> Color(0xFF10B981)
        MonitorStatus.FAILED, MonitorStatus.DISCONNECTED -> Color(0xFFEF4444)
    }
}

fun isNotificationServiceEnabled(context: Context): Boolean {
    val pkgName = context.packageName
    val flat = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
    if (!TextUtils.isEmpty(flat)) {
        val names = flat.split(":")
        for (name in names) {
            val cn = ComponentName.unflattenFromString(name)
            if (cn != null) {
                if (TextUtils.equals(pkgName, cn.packageName)) {
                    return true
                }
            }
        }
    }
    return false
}
