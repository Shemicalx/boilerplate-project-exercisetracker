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
  log: { type: Array },
});

const User = mongoose.model("users", userSchema);

const addUserToDataBase = async (userToCreate) =>
  User.create({ username: userToCreate.username, count: 0, log: [] });

const allUsersNamesAndIds = async () => {
  return User.find({}).select("_id username");
};

const findUserById = async (id) => {
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
    res.json(await findUserById(req.query.userId));
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
