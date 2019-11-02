const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const shortid = require("shortid");

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));

mongoose.connect(process.env.MLAB_URI, { useNewUrlParser: true });

const db = mongoose.connection;
db.on("error", console.error.bind(console, "Error of Connection"));
db.once("open", function() {
  console.log("Connected");

  // Create Exercise SChema
  const exSchema = mongoose.Schema(
    {
      description: String,
      duration: Number,
      date: Date
    },
    { _id: false }
  );

  const exModel = mongoose.model("exModel", exSchema);

  // Create New User Schema
  const userSchema = mongoose.Schema({
    _id: { type: String, default: shortid.generate },
    username: String,
    count: { type: Number, default: 0 },
    log: { type: [exSchema] }
  });

  var userModel = mongoose.model("userModel", userSchema);

  app.post("/api/exercise/new-user", function(req, res) {
    let username = req.body.username;
    if (!username) {
      res.send("Path `username` is required.");
    } else {
      userModel.findOne({ username: username }, function(err, data) {
        if (err) return console.error(err);
        if (!data) {
          let new_user = new userModel({ username: username });
          new_user.save(function(err, data) {
            if (err) return console.error(err);
            console.log("SAVED!!");
            res.json({ _id: data._id, username: data.username });
          });
        } else {
          res.send("username already taken");
        }
      });
    }
  });

  app.get("/api/exercise/users", function(req, res) {
    userModel.find({}, "_id username", function(err, data) {
      if (err) return console.error(err);
      res.json(data);
    });
  });

  app.post("/api/exercise/add", function(req, res) {
    let userId = req.body.userId;
    let description = req.body.description;
    let duration = Number(req.body.duration)
      ? Number(req.body.duration)
      : res.send("Path `duration` is required & MUST be a Number");
    let date =
      new Date(req.body.date) == "Invalid Date"
        ? new Date()
        : new Date(req.body.date);

    if (duration && userId) {
      userModel.findById(userId, function(err, data) {
        if (err) console.error(err);
        if (!data) {
          res.send("unknown _id");
        } else {
          data.log.push({
            description: description,
            duration: duration,
            date: date.toDateString()
          });
          data.count += 1;
          data.save(function(err) {
            if (err) return console.error(err);
            console.log("Success!");
          });
          res.json({
            _id: data._id,
            username: data.username,
            description: data.log[data.log.length - 1].description,
            duration: data.log[data.log.length - 1].duration,
            date: data.log[data.log.length - 1].date.toDateString()
          });
        }
      });
    }
  });

  app.get("/api/exercise/log", function(req, res) {
    let { userId, from, to, limit } = req.query;

    userModel.findById(userId, function(err, data) {
      if (err) console.error(err);
      if (!data) {
        res.send("unknown _id");
      } else {
        if (userId && !from && !to) {
          if (limit) {
            let dataFrom = data.log.sort((x, y) => y.date - x.date);
            dataFrom.splice(limit);
            res.json({
              _id: data._id,
              username: data.username,
              count: dataFrom.length,
              log: dataFrom
            });
          }
          res.json(data);
        } else if (userId && from && !to) {
          from =
            new Date(req.query.from) == "Invalid Date"
              ? res.send("Invalid from Date")
              : new Date(req.query.from);
          let dataFrom = data.log.filter(
            x => new Date(x.date) >= new Date(from)
          );
          dataFrom.sort((x, y) => y.date - x.date);
          if (limit) {
            dataFrom.splice(limit);
          }
          res.json({
            _id: data._id,
            username: data.username,
            count: dataFrom.length,
            log: dataFrom
          });
        } else if (userId && from && to) {
          from =
            new Date(req.query.from) == "Invalid Date"
              ? res.send("Invalid from Date")
              : new Date(req.query.from);
          to =
            new Date(req.query.to) == "Invalid Date"
              ? res.send("Invalid to Date")
              : new Date(req.query.to);
          let dataFrom = data.log.filter(
            x => new Date(x.date) >= new Date(from)
          );
          let dataTo = dataFrom.filter(x => new Date(x.date) <= new Date(to));
          dataTo.sort((x, y) => y.date - x.date);
          if (limit) {
            dataTo.splice(limit);
          }
          res.json({
            _id: data._id,
            username: data.username,
            count: dataTo.length,
            log: dataTo
          });
        }
      }
    });
  });

  // end brackets of db.once
});
//export
module.exports = app;
