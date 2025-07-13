const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
    RoomName: String,
    Type: String
});

module.exports = mongoose.model('Classroom', classroomSchema);