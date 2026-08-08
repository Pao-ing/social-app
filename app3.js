const mongoose = require("mongoose");
const express = require("express");
const app = express();

// 1. Connect to MongoDB (only once when the server starts)
mongoose
  .connect("mongodb://localhost:27017/my_first_db")
  .then(() => console.log("MongoDB Connected"))
  .catch(console.error);

// 2. Define the schema based on your sample document
const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // Student name
    studentId: { type: String, required: true }, // Student ID
    age: Number, // Age
    major: String, // Major
    enrolled: Boolean, // Enrollment status
    courses: [
      // List of enrolled courses
      {
        code: String, // Course code
        name: String, // Course name
        grade: String, // Grade received
      },
    ],
    createdAt: { type: Date, default: Date.now }, // Record creation time
  },
  { collection: "student" },
); // <--explicitly specify the collection name

// 3. Create the model
const Student = mongoose.model("Student", studentSchema);

// 4. Define route to get all students
app.get("/students", async (req, res) => {
  const students = await Student.find();
  res.json(students);
});

// 5. Start the server
app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
