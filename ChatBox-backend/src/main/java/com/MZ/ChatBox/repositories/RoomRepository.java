package com.MZ.ChatBox.repositories;

import com.MZ.ChatBox.entities.Room;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RoomRepository extends MongoRepository<Room,String> {

    //get room by room id
    Room findByRoomId(String roomId);

}

