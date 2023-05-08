const router = require("express").Router();
const conn = require("../db/dbConnection");
const { body, validationResult } = require("express-validator");
const util = require("util"); // helper
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { log } = require("console");



// LOGIN
router.post(
  "/login",
  body("email").isEmail().withMessage("please enter a valid email!"),
  body("password")
    .isLength({ min: 8, max: 12 })
    .withMessage("password should be between (8-12) character"),
  async (req, res) => {
    try {
      // 1- VALIDATION REQUEST [manual, express validation]
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // 2- CHECK IF EMAIL EXISTS
      const query = util.promisify(conn.query).bind(conn); // transform query mysql --> promise to use [await/async]
      const user = await query("SELECT * FROM users WHERE email = ?", [req.body.email]);

      if (user.length == 0) {
        return res.status(404).json({
          errors: [{
            msg: "the email is not found !"
          }]
        });
      }

// 3- CHECK IF PASSWORD MATCHES
const checkPassword = await bcrypt.compare(req.body.password.toString(), user[0].password.toString());

if (!checkPassword) {
  return res.status(404).json({
    errors: [{
      msg: "password is incorrect !"
    }]
  });
}

// 4- CHECK IF ACCOUNT IS ACTIVE
if (user[0].status == 0) {
  return res.status(404).json({
    errors: [{
      msg: "your account is inactive"
    }]
  });
}

await query("UPDATE users SET online_status = 1 WHERE email = ?", [req.body.email]);

const id = user[0].id; 

const userType = user[0].type;

delete user[0].password;

return res.status(200).json({
  msg: "login successfully",
  type: userType,
  id: id // send the userId in the response
  
});
      
    } catch (err) {
      console.error(err)
      return res.status(500).json({
        errors: [{
          msg: "internal server error"
        }]
      });
    }
  }
);

//LOG OUT
router.put("/logout/:id", async (req, res) => {
  try {
    const query = util.promisify(conn.query).bind(conn);
    const user = await query("SELECT * FROM users WHERE id = ?", [req.params.id]);
    if (!user[0]) {
      res.status(400).json({ error: "User not found" });
      return;
    }
    // localStorage.clear();

    // Update user online_status to 0 (offline)
    await query("UPDATE users SET online_status = 0 WHERE id = ?", [req.params.id]);

    // Send the success response
    res.status(200).json({
      msg: "User logged out successfully"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: {
        msg: "Internal server error"
      }
    });
  }
});




// REGISTRATION
router.post(
  "/register",
  body("name")
    .isString()
    .withMessage("please enter a valid name")
    .isLength({ min: 3, max: 20 })
    .withMessage("name should be between (3-20) character"),
  body("email").isEmail().withMessage("please enter a valid email!"),
  body("password")
    .isLength({ min: 8, max: 12 })
    .withMessage("password should be between (8-12) character"),
  body("phone").isMobilePhone().withMessage("please enter a valid phone number!"),
  async (req, res) => {
    try {
      // 1- VALIDATION REQUEST [manual, express validation]
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // 2- CHECK IF EMAIL EXISTS
      const query = util.promisify(conn.query).bind(conn); // transform query mysql --> promise to use [await/async]
      const checkEmailExists = await query(
        "select * from users where email = ?",
        [req.body.email]
      );
      if (checkEmailExists.length > 0) {
        res.status(400).json({
          errors: [
            {
              msg: "email already exists !",
            },
          ],
        });
      }

      // 3- PREPARE OBJECT USER TO -> SAVE
      const userData = {
        name: req.body.name,
        email: req.body.email,
        password: await bcrypt.hash(req.body.password, 9),
        phone:req.body.phone,
        token: crypto.randomBytes(16).toString("hex"), // JSON WEB TOKEN, CRYPTO -> RANDOM ENCRYPTION STANDARD
      };

      // 4- INSERT USER OBJECT INTO DB
      await query("insert into users set ? ", userData);
      delete userData.password;
      res.status(200).json(userData);
    } catch (err) {
      res.status(500).json({ err: err });
    }
  }
);

module.exports = router;
