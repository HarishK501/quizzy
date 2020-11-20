const express = require("express");
const mysql = require("mysql");
const https = require("https");
const fs = require("fs");
const bodyParser = require("body-parser");
const session = require("express-session");
const fileUpload = require("express-fileupload");
const path = require("path");
const { Storage } = require("@google-cloud/storage");

const app = express();

const gc = new Storage({
  keyFilename: __dirname + "/mindful-faculty-284211-1469ac4fbac7.json",
  projectId: "mindful-faculty-284211",
});

const bucketName = "quizzy-question-files";
const quizzyBucket = gc.bucket(bucketName);

process.stdin.resume();

function getDateTime() {
  var d = new Date();
  var datetime =
    d.getFullYear().toString() +
    "-" +
    (d.getMonth() + 1).toString() +
    "-" +
    d.getDate().toString() +
    " " +
    d.getHours().toString() +
    ":" +
    d.getMinutes().toString() +
    ":" +
    d.getSeconds().toString();
  return datetime;
}

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(express.static("public"));
app.use(
  fileUpload({
    createParentPath: true,
  })
);
app.use(
  session({
    secret: "jqbip12198kn12iu31712ed006",
    resave: false,
    saveUninitialized: true,
  })
);

connection = mysql.createConnection({
  host: "sql12.freemysqlhosting.net",
  user: "sql12377123",
  password: "9gwnbtgtnk",
  port: "3306",
  database: "sql12377123",
});

connection.connect(function (err) {
  if (err) {
    console.error("Database connection failed: " + err.stack);
    return;
  }
  console.log("Connected to Database.");
});

app.get("/", function (req, res) {
  if (req.session.loggedin) {
    res.render("index");
  } else {
    res.sendFile(__dirname + "/signup.html");
  }
});

app.get("/login.html", function (req, res) {
  res.sendFile(__dirname + "/login.html");
});

app.get("/signup.html", function (req, res) {
  res.sendFile(__dirname + "/signup.html");
});

app.get("/profile", function (req, res) {
  var email = req.session.email;
  if (req.session.loggedin) {
    connection.query(
      "select * from results where email=? order by submission desc",
      [email],
      function (error, results, fields) {
        if (error) console.log();
        else {
          res.render("profile", {
            name: req.session.username,
            email: req.session.email,
            Data: results,
          });
        }
      }
    );
  } else {
    res.redirect("/");
  }
});

app.post("/register", function (req, res) {
  var email = req.body.email;
  var usrname = req.body.username;
  var password = req.body.password;

  connection.query(
    "insert into users values(?,?,?)",
    [email, usrname, password],
    function (error, results, fields) {
      if (error) {
        if (error.code == "ER_DUP_ENTRY") {
          res.render("failed", {
            message: "You are already a member. Please sign in.",
          });
        } else res.send(error);
      } else {
        // console.log("Entry added to database successfully.");
        req.session.loggedin = true;
        req.session.email = email;
        req.session.username = usrname;
        res.redirect("/");
      }
    }
  );
});

app.post("/auth", function (req, res) {
  var email = req.body.email;
  var password = req.body.password;
  connection.query(
    "select * from users where email = ? and passwd = ? ",
    [email, password],
    function (error, results, fields) {
      if (error) console.log(error);
      else if (results.length > 0) {
        // console.log(results[0]);
        req.session.loggedin = true;
        req.session.email = email;
        req.session.username = results[0].username;
        res.redirect("/");
      } else {
        res.render("failed", {
          message: "Incorrect email id or password.",
        });
      }
    }
  );
});

app.get("/logout", function (req, res) {
  req.session.loggedin = false;
  req.session.email = null;
  req.session.username = null;
  res.redirect("/");
});

app.get("/sample.json", function (req, res) {
  res.sendFile(__dirname + "/tmp/sample.json");
});

app.post("/takeQuiz", function (req, res) {
  // checking whether user is the creator of the quiz
  connection.query(
    "select * from custom where referralCode = ?",
    [req.body.code],
    function (error, results, fields) {
      if (error) throw error;
      if (results.length > 0) {
        if (req.session.email == results[0].author) {
          res.render("failed", {
            message:
              "You are not allowed to take a quiz which you have created.",
          });
        } else {
          req.session.topic = req.body.code;
          var apiURL =
            "https://90al52xu14.execute-api.us-east-1.amazonaws.com/test?bucketname=" +
            bucketName +
            "&filecode=" +
            req.body.code;

          https.get(apiURL, function (response) {
            response.on("data", function (data) {
              var data = JSON.parse(data);
              res.render("quiz", {
                name: "Custom",
                question: JSON.stringify(data),
              });
            });
          });
        }
      } else {
        res.render("failed", {
          message: "Please provide a valid referral code.",
        });
      }
    }
  );
});

app.post("/createQuiz", function (req, res) {
  var myFile = req.files.filetoupload;
  if (!myFile.name.includes(".json")) {
    res.render("failed", {
      message: "Unsupported file format. Please upload a json file.",
    });
    return;
  }
  var code = Math.random().toString(36).slice(4);
  var fileName = __dirname + "/tmp/" + code + ".json";
  fs.writeFile(fileName, myFile.data, function (err) {
    if (err) throw err;
  });

  async function uploadFile(code, keyFile) {
    await quizzyBucket
      .upload(keyFile, {
        resumable: false,
        gzip: true,
      })
      .then(() => {
        fs.unlink(keyFile, function (err) {
          if (err) throw err;
        });
        var file = path.basename(keyFile);
        var fileLocation = `https://storage.googleapis.com/quizzy-question-files/${file}`;
        var datetime = getDateTime();
        connection.query(
          "insert into custom values(?, ?, ?, ?)",
          [req.session.email, code, fileLocation, datetime],
          function (error, results, fields) {
            if (error) console.log(error);
          }
        );
        res.render("filecode", {
          code: code,
        });
      });
    // console.log(`${keyFile} uploaded successfully.`);
  }

  uploadFile(code, fileName).catch(console.error);
});

app.post("/gk", function (req, res) {
  req.session.topic = "General Knowledge";
  https.get("https://opentdb.com/api.php?amount=10&category=9", function (
    response
  ) {
    response.on("data", function (data) {
      var data = JSON.parse(data);
      res.render("quiz", {
        name: "General Knowledge",
        question: JSON.stringify(data.results),
      });
    });
  });
});

app.post("/scienceNature", function (req, res) {
  req.session.topic = "Science & Nature";
  https.get("https://opentdb.com/api.php?amount=10&category=17", function (
    response
  ) {
    response.on("data", function (data) {
      var data = JSON.parse(data);
      res.render("quiz", {
        name: "Science & Nature",
        question: JSON.stringify(data.results),
      });
    });
  });
});

app.post("/sports", function (req, res) {
  req.session.topic = "Sports";
  https.get("https://opentdb.com/api.php?amount=10&category=21", function (
    response
  ) {
    response.on("data", function (data) {
      var data = JSON.parse(data);
      res.render("quiz", {
        name: "Sports",
        question: JSON.stringify(data.results),
      });
    });
  });
});

app.post("/maths", function (req, res) {
  req.session.topic = "Mathematics";
  https.get("https://opentdb.com/api.php?amount=10&category=19", function (
    response
  ) {
    response.on("data", function (data) {
      var data = JSON.parse(data);
      res.render("quiz", {
        name: "Mathematics",
        question: JSON.stringify(data.results),
      });
    });
  });
});

app.post("/history", function (req, res) {
  req.session.topic = "History";
  https.get("https://opentdb.com/api.php?amount=10&category=23", function (
    response
  ) {
    response.on("data", function (data) {
      var data = JSON.parse(data);
      res.render("quiz", {
        name: "History",
        question: JSON.stringify(data.results),
      });
    });
  });
});

app.post("/finish", function (req, res) {
  var datetime = getDateTime();
  connection.query(
    "insert into results values(?,?,?,?)",
    [req.session.email, req.session.topic, req.body.score, datetime],
    function (error, results, fields) {
      if (error) console.log(error);
    }
  );
  res.render("final", {
    score: req.body.score,
  });
});

app.post("/updatePassword", function (req, res) {
  var email = req.session.email;
  var password = req.body.oldpasswd;
  connection.query(
    "select * from users where email = ? and passwd = ? ",
    [email, password],
    function (error, results, fields) {
      if (error) console.log(error);
      else if (results.length > 0) {
        // update password
        connection.query(
          "update users set passwd=? where email=?",
          [req.body.newpasswd, email],
          function (error, results, fields) {
            if (error) console.log(error);
            else {
              res.render("success", {
                message: "Your password has been changed successfully!",
              });
            }
          }
        );
      } else {
        res.render("failed", {
          message: "Incorrect password. Please try again.",
        });
      }
    }
  );
});

app.post("/deleteAccount", function (req, res) {
  var email = req.session.email;
  var password = req.body.passwd;
  connection.query(
    "select * from users where email = ? and passwd = ? ",
    [email, password],
    function (error, results, fields) {
      if (error) console.log(error);
      else if (results.length > 0) {
        // update password
        connection.query("delete from users where email=?", [email], function (
          error,
          results,
          fields
        ) {
          if (error) console.log(error);
          else {
            connection.query("delete from results where email=?", [email]);
            connection.query("delete from custom where author=?", [email]);
            req.session.loggedin = false;
            req.session.email = null;
            req.session.username = null;
            res.send(
              '<script>alert("Your account has been deleted successfully"); window.location.href = "/"; </script>'
            );
            // res.redirect("/");
          }
        });
      } else {
        res.render("failed", {
          message: "Incorrect password. Please try again.",
        });
      }
    }
  );
});

app.listen(process.env.PORT || 3000, function () {
  console.log("Server started running");
});

process.on("SIGINT", function () {
  console.log("\nBreaking connection with DB...");
  connection.end();
  console.log("Closed\n");
  process.exit();
});
