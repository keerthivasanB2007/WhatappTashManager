package com.example.whatsapptaskmanager.api

data class MessageRequest(
    val source: String,
    val sender: String,
    val message: String,
    val receivedAt: String
)
