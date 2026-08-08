const mongoose = require("mongoose");

mongoose
  .connect("mongodb://localhost:27017/My_first_db")
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// creating the schema
const { Schema } = mongoose;
const userSchema = new Schema({
  name: { type: String, required: true },
  age: { type: Number },
  email: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema); // create model

// document creation
const newUser = new User({ name: "Jane", age: 25, email: "jane@example.com" });
newUser.save();

// document retrieval
const foundUsers = User.find({ age: { $gte: 20 } });
console.log(foundUsers);
