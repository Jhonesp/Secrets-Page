import 'dotenv/config';
import express from 'express';
import bodyParser from "body-parser";
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const PORT = 3000;
const app = express();
app.use(express.static('public'))
app.use(bodyParser.urlencoded({extended: true}))
const saltRounds = 10;

async function main(){
    await mongoose.connect('mongodb://127.0.0.1:27017/userDB');
    console.log("conectado a la bd!");
}
main();

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});


const User = mongoose.model("User",userSchema);

app.get("/", (req, res) =>{
    res.render("home.ejs")
})

app.get("/login", (req, res) =>{
    res.render("login.ejs")
})

app.get("/register", (req, res) =>{
    res.render("register.ejs")
})

app.post("/register", async (req, res) =>{
    bcrypt.hash(req.body.password, saltRounds, async function(err, hash) {
        const newUser = new User({
            email: req.body.username,
            password: hash
        });
        
        if(await newUser.save()){
            res.render("secrets.ejs");
        }else{
            res.send("error");
        }
    });
    
    
    
});

app.post("/login", async(req, res) =>{
    const username = req.body.username;
    const password = req.body.password;

    try {
       const foundUser = await User.findOne({email: username});
       if(foundUser){
        const match = await bcrypt.compare(password, foundUser.password)            
            if(match){
                res.render("secrets.ejs");
            }else{
                res.send("Contraseña incorrecta")
            };
       }else{
        res.send("Usuario no existe")
       }
    } catch (error) {
        console.log(error);
    }

})


app.listen(PORT, ()=>{
    console.log(`Funcionando en puerto ${PORT}`);
})

