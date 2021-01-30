const express = require('express');
const mysql = require('mysql');
const session = require('express-session');
const bcrypt = require('bcrypt');
const app = express();

app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'yuTo0713',
  database: 'post'
});

app.use(
  session({
    secret: 'my_secret_key',
    resave: false,
    saveUninitialized: false,
  })
)

app.use((req,res,next) => {

  if(req.session.userId === undefined) {
    res.locals.username ='誰';
    res.locals.userName ='ゲスト';
    res.locals.isLoggedIn = false ;
  }else {
    res.locals.username = req.session.username;
    res.locals.userName = req.session.username;
    res.locals.receiver = req.session.receiver;
    res.locals.isLoggedIn = true ;
  }
  next();
})

app.get('/',(req,res) => {
  res.render('home.ejs');
});

app.get('/contact',(req,res) => {
  res.render('contact.ejs');
});

app.get('/new',(req,res) => {
  res.render('new.ejs',{errors:[]});
});



app.post('/new',
(req,res,next) => {
  console.log('からチェック');
  const userName = req.body.userName;
  const userPassword = req.body.userPassword;
  const errors = [];

  if(userName === '') {
    errors.push('名前入力しろ');
  }
  if(userPassword === '') {
    errors.push('パスワード決めろや');
  }

  if(errors.length >0) {
    res.render('new.ejs',{errors:errors});
  }else {
    next();
  }
},
(req,res,next) => {
  console.log('アカウント2個目？');
  const userName = req.body.userName;
  const errors = [];
  connection.query(
     'SELECT * FROM users WHERE name = ?',
     [userName],
     (error, results) => {
       if (results.length > 0) {
         errors.push('ユーザー登録に失敗しました');
         res.render('new.ejs', { errors: errors });
       } else {
         next();
       }
     }
   );
},
(req,res) => {
  console.log('登録');
  const userName = req.body.userName;
  const userPassword = req.body.userPassword;
  bcrypt.hash(userPassword,10,(error,hash) => {
    connection.query(
      'INSERT INTO users (name, password) VALUE (?, ?)',
      [userName, hash],
      (error,results) => {
        req.session.userId = results.insertId;
        req.session.username = userName;
        res.redirect('/contact');
      }

    );
  });

});




app.get('/login2',(req,res) => {
  res.render('login2.ejs',{errors:[]});
});

app.post('/login2',(req,res) => {
  const userName = req.body.userName ;
  connection.query(
    'SELECT * FROM users WHERE name = ?',
    [userName],
    (error, results) => {
      if(results.length > 0) {
        const plain = req.body.userPassword;
        const hash = results[0].password;
        bcrypt.compare(plain,hash,(error,isEqual) => {

          if(isEqual){
             req.session.userId = results[0].id;
             req.session.username = results[0].name;

            res.redirect('/contact');
          }else {

            res.redirect('/login2');
          }
        });

      }else {
        res.redirect('/login2')
      }
    }
  );
});

app.get('/logout',(req,res) => {
  req.session.destroy((error) => {
    res.redirect('/contact');
  });
});

app.get('/line',(req,res) => {
  const errors = [];
  connection.query(
    'SELECT * FROM users WHERE name =? ',
    [req.session.username],
    (error,results) => {
      if(results.length >0) {
        connection.query(
          'SELECT * FROM users WHERE name !=?',
          [req.session.username],
          (error,results) => {
            res.render('line.ejs',{users:results});
          }
        );
      }else {
       errors.push('ログインしてください');
        res.render('login2.ejs',{errors:errors});

      }
    }
  );
});

app.post('/chat',(req,res,next) => {
  req.session.receiver = req.body.receiver;
  const receiver = req.session.receiver;
  res.locals.receiver = req.session.receiver;
  const sender = req.session.username;
  connection.query(
    ' select * from chat where sender in (?, ?) and receiver in (?, ?)',
    [sender,receiver,sender,receiver],
    (error,results) => {
      res.render('chat.ejs', {chat:results});
    }

  );
}
);

app.get('/chat2',(req,res) => {
  const receiver = req.session.receiver;
  const sender = req.session.username;
  connection.query(
    ' select * from chat where sender in (?, ?) and receiver in (?, ?)',
    [sender,receiver,sender,receiver],
    (error,results) => {
      res.render('chat.ejs', {chat:results});
    }

  );
}
);

app.post('/chat2',(req,res,next) => {
  const message = req.body.message;
  const receiver = req.session.receiver;
  const sender = req.session.username;
  connection.query(
    'INSERT INTO chat (sender, receiver, message) VALUE (?, ?, ?)',
    [sender, receiver,message],
    (error,results) => {
      res.redirect('/chat2');
    }
  );
},

);

app.get('/board',(req,res) => {
  connection.query(
    'SELECT * FROM board ORDER BY id DESC',
    (error,results) => {
      res.render('board.ejs',{board:results});
    }
  );
});

app.post('/board',(req,res,next) => {
  const poster = req.body.posterName;
  const content = req.body.content;
  const errors =[];
  if(poster === '') {
    errors.push('名前を入力して')
  }
  if(content === '') {
    errors.push('入力してください')
  }
  if(errors.length>0) {
    res.redirect('/board')

  }else  {
    next();
  }
},
(req,res) => {
  const poster = req.body.posterName;
  const content = req.body.content;
  connection.query(
    'INSERT INTO board (poster, content) VALUE (?,?)',
    [poster, content],
    (error,results) => {
      res.redirect('/board');
    }
  );
}
);


app.listen(3000);
