import 'dotenv/config';
import express from 'express';
import bodyParser from "body-parser";
import mongoose from 'mongoose';
import session from 'express-session';
import passport from 'passport';
import passportLocalMongoose from 'passport-local-mongoose';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import findOrCreate from 'mongoose-findorcreate';



const PORT = 3000;
const app = express();
app.use(express.static('public'))
app.use(bodyParser.urlencoded({extended: true}))
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
  }));

app.use(passport.initialize());
app.use(passport.session());

async function main(){
    await mongoose.connect('mongodb://127.0.0.1:27017/userDB');
    console.log("conectado a la bd!");
}
main();

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    Secret: String
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User",userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    scope: ["email","profile"]
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    //Crear una funcion util para actualmente crear el perfil si se registra, y rechazar cuando no se consiga el user si es login
    User.findOrCreate({ googleId: profile.id , username: profile.emails[0].value}, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", (req, res) =>{
    res.render("home.ejs")
});

//Rutas de google Auth 2.0
app.get("/auth/google",
    passport.authenticate("google", {scope: ["email","profile"]})
);

app.get("/auth/google/secrets",
    passport.authenticate("google", {failureRedirect: "/login"}),
    (req, res) =>{
        //Autenticacion exitosa, redireccionar a secrets
        res.redirect("/secrets");
    }
);

app.get("/login", (req, res) =>{
    res.render("login.ejs")
});

app.get("/register", (req, res) =>{
    res.render("register.ejs")
});

app.get("/secrets", (req, res)=>{
    User.find({"Secret": {$ne: null} }).then((foundUsers)=>{
        if(foundUsers){
            res.render("secrets.ejs", {usersWithSecrets: foundUsers})
        };
    });
});

app.post("/register", async (req, res) =>{

    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            })
        }
    })
});

app.post("/login", async(req, res) =>{
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        };
    });
});

app.get("/submit", (req, res) =>{
    if(req.isAuthenticated()){
        res.render("submit.ejs");
    }else{
        res.redirect("/login");
    }
});

app.post("/submit", async(req, res) =>{
    const submittedSecret = req.body.secret;
    console.log(req.user.id);

    const rest = await User.findByIdAndUpdate(req.user.id ,{Secret: submittedSecret}).then(()=>{
        res.redirect("/secrets");
    });
    
    // await User.findById(req.user.id).then(async function (foundUser){
    //     if(foundUser){
    //         foundUser.secret = submittedSecret;
    //         await foundUser.save().then( ()=>{
    //             res.redirect("/secrets");
    //         });
    //     };
    // });
});

app.get("/logout", (req, res) =>{
    req.logout(function(err){
        if(err){
            console.log(err);
        }
        res.redirect("/");
    });
    
});


app.listen(PORT, ()=>{
    console.log(`Funcionando en puerto ${PORT}`);
})

