const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    ClassName: String,
    HomeRoom: String,
    SubjectName: String,
    TeacherName: String,
    PeriodsPerWeek: Number,
    DefaultBlockSize: Number,
    RequiresRoomType: String
});

module.exports = mongoose.model('Assignment', assignmentSchema);