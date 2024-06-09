const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer  = require("multer");
const path = require("path");
const cors = require("cors");
const { log } = require("console");

app.use(express.json());
app.use(cors());

// database connection with mongodb
mongoose.connect("mongodb+srv://vriya279:verma14v@cluster0.z18gkj4.mongodb.net/e-commerce")

//// for Api

// app.get('/api/items', async (req, res) => {
//     try {
//       const items = await Product.find({}); // Assuming Product is your model
//       res.json(items);
//     } catch (error) {
//       console.error('Error fetching items:', error);
//       res.status(400).send('Server error');
//     }
//   });
  


//API creation 

app.get("/",(req,res)=>{
     res.send("Express App is Running")
})

// image storage engine

const storage = multer.diskStorage({
    destination:'./upload/images',
    filename:(req,file,cb)=>{
     return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({storage:storage})

// creating upload endpoint for images

app.use('/images',express.static('upload/images'))

app.post("/upload",upload.single('product'),(req,res)=>{
        res.json({
            success:1,
            image_url:`http://localhost:${port}/images/${req.file.filename}`
        })
})

//schema for creating products

const Product = mongoose.model("Product",{
    id:{
        type: Number,
        required:true,
    },
    name:{
        type: String,
        required: true,
    },
    image:{
        type: String,
        required: true,
    },
    category:{
        type: String,
        required: true,
    },
    price:{
        type: Number,
        required: true,
    },
    date:{
        type: Date,
        default: Date.now,
    },
    available:{
        type: Boolean,
        default: true,
    },
})

app.post('/addproduct', async (req,res)=>{
    let products = await Product.find({});
    let id;
    if(products.length>0){
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id+1;
    }
    else{
        id=1;
    }
    const product = new Product({
        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        price:req.body.price,
    });
    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        success:true,
        name: req.body.name,
    })
})

// creating api for deleting products

app.post('/removeproduct',async(req,res)=>{
  await Product.findOneAndDelete({id:req.body.id});
  console.log("Removed");
  res.json({
    success:true,
    name:req.body.name
  })
})


// creating API for getting all products
app.get('/allproducts',async(req,res)=>{
 let products = await Product.find({});
  console.log("All Products Fetched");
  res.send(products);
})

//schema  creating for user model

const Users = mongoose.model('Users',{
    name:{
        type:String,

    },
    email:{
        type:String,
        unique:true,
    },
    password:{
        type:String,

    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now,
    }
})

//creating endpoint for registering the user
app.post('/signup',async (req,res)=>{
    console.log("Signup Request Received", req.body);

    let check = await Users.findOne({email:req.body.email});
    if(check){
        return res.status(400).json({success:false,errors:"existing user found with same email address"})
    }
    let cart = {};
    for(let i = 0; i < 300; i++){
        cart[i] = 0;
    }
    const user = new Users({
        name:req.body.username,
        email:req.body.email,
        password:req.body.password,
        cartData:cart,
    })

    await user.save();

    const data = {
        user:{
            id:user.id
        }
    }

    const token = jwt.sign(data,'secret_ecom');
    res.json({success:true,token})
})

//creating enpoint for user login
app.post('/login',async (req,res)=>{
    let user = await Users.findOne({email:req.body.email});
    if(user){
        const passCompare = req.body.password === user.password;
        if(passCompare){
            const data = {
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data,'secret_ecom');
            res.json({success:true,token});
        }
        else{
            res.json({success:false,errors:"Wrong Password"});
        }
    }
    else{
        res.json({success:false,errors:"Wrong Email Id"})
    }
})


//creating endpoint for newcollection data
app.get('/newcollections',async (req,res)=>{
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log("NewCollection Fetched");
    res.send(newcollection)
})

//creating endpoint for popular in decor section
app.get('/popularinmandala',async (req,res)=>{
   let products = await Product.find({category:"mandala"});
   let popular_in_mandala = products.slice(0,4);
   console.log("Popular in women fetched");
   res.send(popular_in_mandala);
})

//creating middleware to fetch user
const fetchUser = async (req,res,next)=>{
       const token = req.header('auth-token');
       if(!token){
        res.status(401).send({errors:"Please authenticate using valid token"})
       }
       else{
        try{
             const data = jwt.verify(token,'secret_ecom');
             req.user = data.user;
             next();
        } catch (error) {
            res.status(401).send({errors:"please authenticate using a valid token"})
        }
       }
}

//creating endpoint for adding products in cartdata
app.post('/addtocart',fetchUser,async (req,res)=>{
    console.log("Added",req.body.itemId);
  let userData = await Users.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Added")
})

// creating endpoint to remive product from cartdata
app.post('/removefromcart',fetchUser, async (req,res)=>{
    console.log("removed",req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    if(userData.cartData[req.body.itemId]>0) 
    userData.cartData[req.body.itemId] -= 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Removed")
})

// creating endpoint to get cart data
app.post('/getcart',fetchUser,async (req,res)=>{
     console.log("GetCart");
     let userData = await Users.findOne({_id:req.user.id});
     res.json(userData.cartData);
})


app.listen(port,(error)=>{
    if(!error){
        console.log("Server Running on Port "+port)
    }
    else{
        console.log("Error :" +error)
    }
})



