const express = require("express");
const chalk = require("chalk");
const path = require("path");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const session = require("express-session");

const mongoose = require("mongoose");
const Feed = require("./models/feed");

const app = express();
const User = require("./models/user");
const bcrypt = require("bcrypt");

app.set("view engine", "ejs"); //EJS setup
app.set("views", path.join(__dirname, "views"));

app.use("/css", express.static(path.join(__dirname, "public", "css")));
app.use("/js", express.static(path.join(__dirname, "public", "js")));

//middleware
app.use(morgan("common"));
//middleware known as session
app.use(
  session({
    secret: "mySecretKey",
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 5,
    }, // 5 minutes
  }),
);
app.use(cookieParser());

// //middleware
// app.get("/login", (req, res) => {
//   req.session.username = "John";
//   res.send("Login sucess! Session saved!");
// });

// app.get("/profile", (req, res) => {
//   if (req.session.username) {
//     res.send(`Hello ${req.session.username}`);
//   } else {
//     res.send("Please login first.");
//   }
// });

// app.get("/logout", (req, res) => {
//   req.session.destroy((err) => {
//     if (err) {
//       return res.send("Error logging out");
//     }
//     res.clearCookie("connect.sid");
//     res.send("Logged out successfully");
//   });
// });
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB (only once when the server starts)
mongoose
  .connect("mongodb://localhost:27017/My_first_db")
  .then(() =>
    console.log(chalk.bgHex("#b2ebf2").black.bold("🌞 MongoDB Connected")),
  )
  .catch(console.error);

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.send("Invalid username or password!");
    }
    req.session.username = username;
    res.redirect("/");
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).send("Error during login");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send("Error logging out");
    }
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});

app.get("/", (req, res) => {
  // res.sendFile(path.join(__dirname, "public", "index.html"));
  res.render("index", { username: req.session.username });
});

app.get("/write", (req, res) => {
  if (req.session.username) {
    //res.sendFile(path.join(__dirname, "public", "write.html"));
    res.render("write");
  } else {
    res.redirect("/");
  }
});

app.post("/write", async (req, res) => {
  const { content } = req.body;

  if (!req.session.username) {
    return res.redirect("/");
  }

  const newFeed = new Feed({ content, author: req.session.username });

  await newFeed
    .save()
    .then(() => {
      console.log("Feed saved successfully");
      res.redirect("/posts");
    })
    .catch((err) => {
      console.error("Error saving feed:", err);
      res.status(500).send("Error saving feed");
    });
});

app.get("/posts", async (req, res) => {
  if (!req.session.username) {
    return res.redirect("/");
  } //else {
  //   res.redirect("/");
  // }
  try {
    const user = await User.findOne({ username: req.session.username });
    const feeds = await Feed.find({
      author: { $in: [...user.friends, user.username] },
    }).sort({
      //createdAt: -1,
    }); //descending order
    const posts = feeds.map((feed) => ({
      ...feed.toObject(),
      isLiked: feed.likes.includes(req.session.username),
    }));
    res.render("posts", { posts });
  } catch (error) {
    console.error("Error loading posts", err);
    res.status(500).send("Error loading posts");
  }
});

// app.get("/register", (req, res) => {
//   res.render("register");
// });

app.post("/register", async (req, res) => {
  const { username, password, name } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.send("Username already exists!");
    }

    const newUser = new User({ username, password, name });
    await newUser.save();
    res.redirect("/");
  } catch (err) {
    console.error("Error during registration:", err);
    res.status(500).send("Error during registration");
  }
});

app.get("/friends/list", async (req, res) => {
  if (!req.session.username) {
    return res.redirect("/");
  }
  try {
    const user = await User.findOne({ username: req.session.username });
    res.render("friends", { friends: user.friends, findedfriends: [] });
  } catch (err) {
    console.error("Error fetching friends list:", err);
    res.status(500).send("Error fetching friends list");
  }
});

app.post("/friends/search", async (req, res) => {
  const { friendUsername } = req.body;
  if (!req.session.username) {
    return res.redirect("/");
  }

  try {
    //Search for the logged-in user
    const user = await User.findOne({ username: req.session.username });

    //search for users whose username includes the search term
    const findedfriends = await User.find({
      $and: [
        //includes search term
        { username: { $regex: friendUsername, $options: "i" } },
        //exclude already added friends and self
        { username: { $nin: [...user.friends, user.username] } },
      ],
    });
    res.render("friends", { friends: user.friends, findedfriends });
  } catch (err) {
    console.error("Error searching friend:", err);
    res.status(500).send("Error searching friend");
  }
});

app.post("/friends/add", async (req, res) => {
  const { friendUsername } = req.body;

  if (!req.session.username) {
    return res.redirect("/");
  }

  try {
    const user = await User.findOne({ username: req.session.username });
    const friend = await User.findOne({ username: friendUsername });

    if (!friend) {
      return res.send("User not found!");
    }

    if (user.friends.includes(friend.username)) {
      return res.send("Already friends!");
    }

    user.friends.push(friend.username);
    await user.save();

    res.redirect("/friends/list");
  } catch (err) {
    console.error("Error adding friend:", err);
    res.status(500).send("Error adding friend");
  }
});

app.post("/posts/:uuid/like", async (req, res) => {
  if (!req.session.username) {
    return res.status(401).send("Unauthorized");
  }
  try {
    const feed = await Feed.findOne({ uuid: req.params.uuid }); // Find feed by uuid

    if (!feed) {
      return res.status(404).send("Feed not found");
    }

    const username = req.session.username;

    // Toggle like
    if (feed.likes.includes(username)) {
      // Remove like if already liked
      feed.likes = feed.likes.filter((user) => user !== username);
    } else {
      // Add like if not already liked
      feed.likes.push(username);
    }

    await feed.save();
    res.json({ likesCount: feed.likes.length }); // Return updated likes count
  } catch (err) {
    console.error("Error toggling like:", err);
    res.status(500).send("Error toggling like");
  }
});
app.listen(3000, () => {
  console.log(chalk.bgHex("#ff69b4").white.bold("EXPRESS SERVER STARTED"));
  console.log(chalk.green("Running at:") + chalk.cyan("http://localhost:3000"));
  console.log(chalk.gray("Press Ctrl+C to stop the server."));
});

//sample code to create a new feed
// const sampleFeed = new Feed({
//   content: "This is my first SNS feed!",
//   author: "TEST_USER",
// });

// sampleFeed
//   .save()
//   .then(() => console.log("✅ Test feed saved"))
//   .then(() => {
//     Feed.find().then((feeds) => {
//       console.log(feeds);
//     });
//   })
//   .catch((err) => console.error("❌ Error:", err));
