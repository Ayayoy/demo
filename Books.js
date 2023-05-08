const router = require("express").Router();
const conn = require("../db/dbConnection");
const authorized = require("../middleware/authorize");
const admin = require("../middleware/admin");
const { body, validationResult } = require("express-validator");
const upload = require("../middleware/uploadImages");
const util = require("util"); // helper
const fs = require("fs"); // file system

// CREATE BOOK [ADMIN]
router.post(
    "/create",
    // admin,
    upload.single("image"),
    body("title")
      .isString()
      .withMessage("please enter a valid book title")
      .isLength({ min: 10 })
      .withMessage("book title should be at least 10 characters"),
  
    body("author")
      .isString()
      .withMessage("please enter a valid author ")
      .isLength({ min: 3 })
      .withMessage("author name should be at least 3 characters"),
    body("subject")
      .isString()
      .withMessage("please enter a valid subject ")
      .isLength({ min: 2 })
      .withMessage("subject name should be at least 2 characters"),
    body("isbn")
      .isNumeric()
      .withMessage("please enter a valid ISBN ")
      .isLength({ min: 13 })
      .withMessage("ISBN should be at least 13 characters"),
    body("rack_number")
      .isString()
      .withMessage("please enter a valid rack number ")
      .isLength({ min: 5 })
      .withMessage("rack number should be at least 5 characters"),
    async (req, res) => {
      try {
        // 1- VALIDATION REQUEST [manual, express validation]
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
  
        // 2- VALIDATE THE IMAGE
        if (!req.file) {
          return res.status(400).json({
            errors: [
              {
                msg: "Image is Required",
              },
            ],
          });
        }
  
        // 3- PREPARE BOOK OBJECT
        const book = {
          title: req.body.title,
          author: req.body.author,
          subject: req.body.subject,
          isbn: req.body.isbn,
          image_url: req.file.originalname,
          rack_number: req.body.rack_number
        };
  
        // 4 - INSERT BOOK INTO DB
        const query = util.promisify(conn.query).bind(conn);
        await query("insert into books set ? ", book);
        res.status(200).json({
          msg: "book created successfully !",
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    }
  );
  

// UPDATE BOOK [ADMIN]
router.put(
    "/:id", // params
    // admin,
    upload.single("image"),
    body("title"),
    body("author"),
    body("subject"),
    body("isbn"),

    async (req, res) => {
        try {
            // 1- VALIDATION REQUEST [manual, express validation]
            const query = util.promisify(conn.query).bind(conn);
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            // 2- CHECK IF BOOK EXISTS OR NOT
            const book = await query("select * from books where id = ?", [
                req.params.id,
            ]);
            if (!book[0]) {
                res.status(404).json({ ms: "book not found !" });
            }

            // 3- PREPARE BOOK OBJECT
            const bookObj = {};
            
            if (req.body.title) {
                bookObj.title = req.body.title;
            } else {
                bookObj.title = book[0].title;
            }

            if (req.body.author) {
                bookObj.author = req.body.author;
            } else {
                bookObj.author = book[0].author;
            }

            if (req.body.subject) {
                bookObj.subject = req.body.subject;
            } else {
                bookObj.subject = book[0].subject;
            }

            if (req.body.isbn) {
                bookObj.isbn = req.body.isbn;
            } else {
                bookObj.isbn = book[0].isbn;
            }

            if (req.file) {
                bookObj.image_url = req.file.filename;
                fs.unlinkSync("./upload/" + book[0].image_url); // delete old image
            } else {
                bookObj.image_url = book[0].image_url;
            }

            // 4- UPDATE BOOK
            await query("update books set ? where id = ?", [bookObj, book[0].id]);

            res.status(200).json({
                msg: "book updated successfully",
            });
        } catch (err) {
            res.status(500).json(err);
        }
    }
);

// DELETE BOOK [ADMIN]
router.delete("/:id",
//  admin,
  async (req, res) => {
        try {
            // 1- CHECK IF BOOK EXISTS OR NOT
            const query = util.promisify(conn.query).bind(conn);
            const book = await query("select * from books where id = ?", [
                req.params.id,
            ]);
            if (!book[0]) {
                res.status(404).json({ ms: "book not found !" });
            }
            else {
                const query = util.promisify(conn.query).bind(conn);
                // Delete the row with the specified ID from the books table
                await query("DELETE FROM books WHERE id = ?", [req.params.id]);
                res.status(200).json({ message: "Book deleted successfully" });
            }
            
              
        } catch (err) {
            res.status(500).json(err);
        }
    }
);


//FILTER BOOKS BY ISBN
router.get("/filter",
//  admin,
  async (req, res) => {
  try {
    const query = util.promisify(conn.query).bind(conn);
    const books = await query("SELECT * FROM books ORDER BY isbn,rack_number");
    books.forEach((book) => {
      book.image_url = "http://" + req.hostname + ":4000/" + book.image_url;
    });
    res.status(200).json(books);
  } catch (err) {
    res.status(500).json(err);
  }
});


// SHOW IN-ACTIVE USERS
router.get("/users",
//  admin,
  async (req, res) => {
  try {
      const query = util.promisify(conn.query).bind(conn);
      const user = await query("select * from users where status = 0");


      res.status(200).json({ ms: " these are users who registered",user });
  } catch (err) {
      res.status(500).json(err);
  }
});

// MANAGE USER ACCOUNTS [ADMIN ONLY]
// 1-APPROVE
router.put("/users/:id",
//  admin,
  async (req, res) => {
    try {
        const query = util.promisify(conn.query).bind(conn);
        const user = await query("select * from users where id = ?", [req.params.id]);
        if (!user[0]) {
            res.status(404).json({ ms: "user not found !" });
        }

// Update user status to 1
await query("UPDATE users SET status = 1, return_date = ? WHERE id = ?", [req.params.id]);
        res.status(200).json({ ms: "user status updated successfully" });
    } catch (err) {
        res.status(500).json(err);
    }
});

//2-REJECT
router.delete("/users/:id",
//  admin,
  async (req, res) => {
  try {
      // 1- CHECK IF BOOK EXISTS OR NOT
      const query = util.promisify(conn.query).bind(conn);
      const user = await query("select * from users where id = ?", [
          req.params.id,
      ]);
      if (!user[0]) {
          res.status(404).json({ ms: "user not found !" });
      }
      else {
          const query = util.promisify(conn.query).bind(conn);
          // Delete the row with the specified ID from the books table
          await query("DELETE FROM users WHERE id = ?", [req.params.id]);
          res.status(200).json({ message: "user deleted successfully" });
      }
      
        
  } catch (err) {
      res.status(500).json(err);
  }
}
);

//MANAGE BORROW REQUESTS
// GET route to retrieve a borrow request
router.get("/borrow", async (req, res) => {
  try {
    const query = util.promisify(conn.query).bind(conn);
    const borrowRequests = await query(`
      SELECT borrow.*, users.email, users.name, books.title
      FROM borrow 
      INNER JOIN users ON borrow.user_id = users.id 
      INNER JOIN books ON borrow.book_id = books.id
      WHERE borrow.status = 0`);

    if (!borrowRequests || borrowRequests.length === 0) {
      res.status(404).json({ ms: "Borrow requests not found!" });
    } else {
      res.status(200).json(borrowRequests);
    }
  } catch (err) {
    res.status(500).json(err);
  }
});
// 1-ACCEPT
router.put("/borrow/:id/accept",
body("return_date").isDate(),
//  admin,
  async (req, res) => {
  try {
    const query = util.promisify(conn.query).bind(conn);
    const borrow = await query("SELECT * FROM borrow WHERE id = ?", [
      req.params.id,
    ]);
    if (!borrow[0]) {
      res.status(404).json({ ms: "Borrow request not found!" });
    } else {
      await query("UPDATE borrow SET status = 1 WHERE id = ?", [req.params.id]);
            res.status(200).json({ ms: "Borrow request accepted successfully" });
    }
  } catch (err) {
    res.status(500).json(err);
  }
});



//2-REJECT
router.delete("/borrow/:id/reject",
//  admin,
  async (req, res) => {
  try {
      // 1- CHECK IF REQUEST EXISTS OR NOT
      const query = util.promisify(conn.query).bind(conn);
      const borrow = await query("select * from borrow where id = ?", [
          req.params.id,
      ]);
      if (!borrow[0]) {
          res.status(404).json({ ms: "borrow request not found !" });
      }
      else {
          const query = util.promisify(conn.query).bind(conn);
          // Delete the row with the specified ID from the books table
          await query("DELETE FROM borrow WHERE id = ?", [req.params.id]);
          res.status(200).json({ message: "borrow request rejected successfully" });
      }
      
        
  } catch (err) {
      res.status(500).json(err);
  }
}
);




//SEARCH AND LIST
router.get("", async (req, res) => {
  const query = util.promisify(conn.query).bind(conn);
  let searchQuery = "SELECT * FROM books";
  let searchParams = [];

  if (req.query.search) {
    searchQuery += " WHERE title LIKE ? OR author LIKE ? OR subject LIKE ? OR isbn LIKE ?";
    searchParams = Array(4).fill(`%${req.query.search}%`);
  }

  const books = await query(searchQuery, searchParams);

  books.map((book) => {
    book.image_url = "http://" + req.hostname + ":4000/" + book.image_url;
  });

  res.status(200).json(books);
});


//SEND BORROW REQUEST [ONLY USER]
router.post("/borrow/id:/:user_id",
  // authorized,
  async (req, res) => {
    try {
      // 1- VALIDATION REQUEST [manual, express validation]
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // 2- CHECK IF BOOK EXISTS
      const query = util.promisify(conn.query).bind(conn);
      const checkBookExists = await query("SELECT * FROM books WHERE id = ?", [req.params.id]);
      if (checkBookExists.length === 0) {
        return res.status(400).json({
          errors: [
            {
              msg: "Book does not exist!",
            },
          ],
        });
      }

      // 3- CHECK IF USER EXISTS
     
      const checkUserExists = await query("SELECT * FROM users WHERE id = ?", [req.params.user_id]);
      if (checkUserExists.length === 0) {
        return res.status(400).json({
          errors: [
            {
              msg: "User does not exist!",
            },
          ],
        });
      }

      // 4- CHECK IF USER HAS ALREADY BORROWED THIS BOOK
      const checkBorrowExists = await query("SELECT * FROM borrow WHERE book_id = ? AND user_id = ?", [req.params.id, req.params.user_id]);
      if (checkBorrowExists.length > 0) {
        return res.status(400).json({
          errors: [
            {
              msg: "User has already borrowed this book!",
            },
          ],
        });
      }

      // 5- CHECK IF USER HAS EXCEEDED MAXIMUM NUMBER OF BORROW REQUESTS
      const countBorrowRequests = await query("SELECT COUNT(*) AS count FROM borrow WHERE user_id = ?", [req.params.user_id]);
      if (countBorrowRequests[0].count >= 3) {
        return res.status(400).json({
          errors: [
            {
              msg: "User has exceeded the maximum number of borrow requests!",
            },
          ],
        });
      }

      // 6- PREPARE OBJECT BORROW TO -> SAVE
      const borrow = {
        book_id: req.params.id,
        user_id: req.params.user_id,
        status: 0       
      };

      // 7- INSERT BORROW OBJECT INTO DB
      await query("INSERT INTO borrow SET ?", [borrow]);

      res.status(200).json({
        msg: "Borrow request sent successfully!",
      });
    } catch (err) {
      console.error(err);
      res.status(500).json(err);
    }
  }
);




//SHOW LIST OF BORROWED BOOKS[ONLY USER]
router.get('/borrowedBooks/:user_id', async (req, res) => {
  const query = util.promisify(conn.query).bind(conn);
  const borrowedBooks = await query(`
    SELECT b.* 
    FROM borrow AS br
    JOIN books AS b ON br.book_id = b.id
    WHERE br.user_id = ? AND br.status = 1`, [req.params.user_id]);
  if (!borrowedBooks[0]) {
    res.status(404).json({ ms: "there is no borrowed books !" });
  }
  borrowedBooks.map((book) => {
    book.image_url = 'http://' + req.hostname + ':4000/' + book.image_url;
  });
  res.status(200).json(borrowedBooks);
});


  // SHOW BOOK [ADMIN, USER]
router.get("/:id", async (req, res) => {
  const query = util.promisify(conn.query).bind(conn);
  const book = await query("select * from books where id = ?", [
      req.params.id,
  ]);
  if (!book[0]) {
      res.status(404).json({ ms: "book not found !" });
  }
  book[0].image_url = "http://" + req.hostname + ":4000/" + book[0].image_url;
  res.status(200).json(book[0]);
});



module.exports = router;
