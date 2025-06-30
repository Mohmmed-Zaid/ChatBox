package com.MZ.ChatBox.controller;

import com.MZ.ChatBox.entities.Message;
import com.MZ.ChatBox.entities.Room;
import com.MZ.ChatBox.repositories.RoomRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/v1/rooms")
@CrossOrigin("http://localhost:5173")
public class RoomController {

    private static final Logger logger = LoggerFactory.getLogger(RoomController.class);

    private final RoomRepository roomRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // Track online users per room
    private final Map<String, Integer> roomUserCounts = new ConcurrentHashMap<>();

    public RoomController(RoomRepository roomRepository, SimpMessagingTemplate messagingTemplate) {
        this.roomRepository = roomRepository;
        this.messagingTemplate = messagingTemplate;
    }

    // Create room
    @PostMapping
    public ResponseEntity<?> createRoom(@RequestBody String roomId) {
        logger.info("Creating room with ID: {}", roomId);

        if (roomRepository.findByRoomId(roomId) != null) {
            logger.warn("Room already exists: {}", roomId);
            return ResponseEntity.badRequest().body("Room already exists!");
        }

        Room room = new Room();
        room.setRoomId(roomId);
        Room savedRoom = roomRepository.save(room);

        // Initialize user count
        roomUserCounts.put(roomId, 0);

        logger.info("Room created successfully: {}", roomId);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedRoom);
    }

    // Get room: join
    @GetMapping("/{roomId}")
    public ResponseEntity<?> joinRoom(@PathVariable String roomId) {
        logger.info("User attempting to join room: {}", roomId);

        Room room = roomRepository.findByRoomId(roomId);
        if (room == null) {
            logger.warn("Room not found: {}", roomId);
            return ResponseEntity.badRequest().body("Room not found!");
        }

        // Increment user count
        roomUserCounts.merge(roomId, 1, Integer::sum);

        // Notify other users about user count change
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/users",
                roomUserCounts.get(roomId));

        logger.info("User joined room: {}. Current user count: {}", roomId, roomUserCounts.get(roomId));
        return ResponseEntity.ok(room);
    }

    // Leave room (new endpoint)
    @PostMapping("/{roomId}/leave")
    public ResponseEntity<?> leaveRoom(@PathVariable String roomId) {
        logger.info("User leaving room: {}", roomId);

        Room room = roomRepository.findByRoomId(roomId);
        if (room == null) {
            return ResponseEntity.badRequest().body("Room not found!");
        }

        // Decrement user count
        roomUserCounts.merge(roomId, -1, (oldVal, delta) -> Math.max(0, oldVal + delta));

        // Notify other users about user count change
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/users",
                roomUserCounts.get(roomId));

        logger.info("User left room: {}. Current user count: {}", roomId, roomUserCounts.get(roomId));
        return ResponseEntity.ok().build();
    }

    // Get room info including user count
    @GetMapping("/{roomId}/info")
    public ResponseEntity<?> getRoomInfo(@PathVariable String roomId) {
        Room room = roomRepository.findByRoomId(roomId);
        if (room == null) {
            return ResponseEntity.badRequest().body("Room not found!");
        }

        Map<String, Object> roomInfo = new HashMap<>();
        roomInfo.put("room", room);
        roomInfo.put("userCount", roomUserCounts.getOrDefault(roomId, 0));
        roomInfo.put("messageCount", room.getMessages().size());

        return ResponseEntity.ok(roomInfo);
    }

    // Get messages of room
    @GetMapping("/{roomId}/messages")
    public ResponseEntity<List<Message>> getMessages(
            @PathVariable String roomId,
            @RequestParam(value = "page", defaultValue = "0", required = false) int page,
            @RequestParam(value = "size", defaultValue = "20", required = false) int size
    ) {
        logger.info("Fetching messages for room: {}, page: {}, size: {}", roomId, page, size);

        Room room = roomRepository.findByRoomId(roomId);
        if (room == null) {
            logger.warn("Room not found when fetching messages: {}", roomId);
            return ResponseEntity.badRequest().build();
        }

        List<Message> messages = room.getMessages();

        // Pagination logic - get recent messages
        int totalMessages = messages.size();
        int start = Math.max(0, totalMessages - (page + 1) * size);
        int end = Math.min(totalMessages, start + size);

        List<Message> paginatedMessages = messages.subList(start, end);

        logger.info("Returning {} messages for room: {}", paginatedMessages.size(), roomId);
        return ResponseEntity.ok(paginatedMessages);
    }
}