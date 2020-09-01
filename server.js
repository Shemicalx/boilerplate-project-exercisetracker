const express = require("express");
const app = express();
const bodyParser = require("body-parser");
require("dotenv").config();

const cors = require("cors");

const mongoose = require("mongoose");
mongoose.connect(process.env.MLAB_URI || process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Schema = mongoose.Schema;
const userSchema = new Schema({
  username: { type: String, required: true },
  count: { type: Number },
  log: [
    {
      description: { type: String, required: true },
      duration: { type: Number, required: true },
      date: Number,
    },
  ],
});

const User = mongoose.model("users", userSchema);

const addUserToDataBase = async (userToCreate) =>
  User.create({ username: userToCreate.username, count: 0, log: [] });

const addExerciseLogToUser = async (exerciseLog, userToUpdate) => {
  userToUpdate.log.push({
    description: exerciseLog.description,
    duration: exerciseLog.duration,
    date: exerciseLog.date ? Date.parse(exerciseLog.date) : Date.now(),
  });
  userToUpdate.log.sort((a, b) => a.date - b.date);
  userToUpdate.count = userToUpdate.log.length;
  return userToUpdate.save();
};

const allUsersNamesAndIds = async () => {
  return User.find({}).select("_id username");
};

const findUserById = (id) => {
  return User.findById(id).select("_id username count log");
};

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

//POST /api/exercise/new-user
app.post("/api/exercise/new-user", async (req, res, next) => {
  try {
    const { _id, username } = await addUserToDataBase(req.body);
    res.status(201).json({ _id, username });
  } catch (error) {
    next(error);
  }
});

//POST /api/exercise/add
app.post("/api/exercise/add", async (req, res, next) => {
  try {
    if (!req.body.userId || !req.body.description || !req.body.duration) {
      return res.send("Oi");
    }
    const { _id, username } = await addExerciseLogToUser(
      req.body,
      await findUserById(req.body.userId)
    );
    const { description, duration, date } = req.body;
    res.json({
      _id,
      username,
      date: new Date(Date.parse(date) || Date.now()).toDateString(),
      duration: parseInt(duration),
      description,
    });
  } catch (error) {
    next(error);
  }
});

//Get an array of all users
app.get("/api/exercise/users", async (req, res, next) => {
  try {
    res.json(await allUsersNamesAndIds());
  } catch (error) {
    next(error);
  }
});

//Get a specific user and its log + count
app.get("/api/exercise/log", async (req, res, next) => {
  try {
    const userToLog = await findUserById(req.query.userId).lean();
    //[&from][&to][&limit]
    const { from, to, limit } = req.query;
    if (from) {
      userToLog.log = userToLog.log.filter(
        (eLog) => eLog.date > new Date(from).getTime()
      );
    }
    if (to) {
      userToLog.log = userToLog.log.filter(
        (eLog) => eLog.date < new Date(to).getTime()
      );
    }
    if (limit) {
      userToLog.log = userToLog.log.slice(0, limit);
    }
    userToLog.log.forEach((dateObj) => {
      dateObj.date = new Date(dateObj.date).toDateString();
    });
    res.json(userToLog);
  } catch (error) {
    next(error);
  }
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res.status(errCode).type("txt").send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
