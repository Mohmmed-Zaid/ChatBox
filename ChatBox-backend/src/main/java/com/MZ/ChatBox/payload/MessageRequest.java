// File: src/main/java/com/MZ/ChatBox/payload/MessageRequest.java

package com.MZ.ChatBox.payload;

public class MessageRequest {
    private String sender;
    private String content;
    private String roomId;

    // Getters and Setters
    public String getSender() {
        return sender;
    }
    public void setSender(String sender) {
        this.sender = sender;
    }

    public String getContent() {
        return content;
    }
    public void setContent(String content) {
        this.content = content;
    }

    public String getRoomId() {
        return roomId;
    }
    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }
}
