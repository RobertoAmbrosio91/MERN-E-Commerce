const { generateToken } = require('../config/jwToken');
const User=require('../models/userModel');
const Product=require('../models/productModel');
const Cart=require('../models/cartModel');
const Order=require('../models/ordermodel');
const uniquid=require('uniquid');
const asyncHandler=require("express-async-handler");
const validateMongoDbId = require('../utils/validateMongodb');
const { generateRefreshToken } = require('../config/refreshtoken');
const { JsonWebTokenError } = require('jsonwebtoken');
const jwt=require('jsonwebtoken');
const sendEmail = require('./emailCtrl');
const crypto=require('crypto');


// Signup functionality

const createUser= asyncHandler(async (req, res)=>{
    const email=req.body.email;
    const findUser= await User.findOne({email : email });

    if(!findUser){
        //create a new user
        const newUser = User.create(req.body);
        res.json(newUser);
    }
    else{
        //user already exist
        throw new Error('User already exists')
    }
});

// login functionality

const loginUserCtrl=asyncHandler(async(req,res)=>{
    const {email,password}=req.body;
    //check if user exists
    const findUser=await User.findOne({email});
    if(findUser && await findUser.isPasswordMatched(password)){
        const refreshToken=await generateRefreshToken(findUser?._id);
        const updateuser=await User.findOneAndUpdate(findUser.id, {
            refreshToken:refreshToken,
        }
    ,
    {new:true});

        res.cookie('refreshToken',refreshToken,{
           httpOnly:true,
           maxAge: 72 * 60 *60 * 1000,

        })
        res.json({
            _id:findUser?._id,
            firstname:findUser?.firstname,
            lasttname:findUser?.lastname,
            email:findUser?.email,
            password:findUser?.password,
            token:generateToken(findUser?._id)
        });
    }
    else{
        throw new Error("Invalid Credentials");
    }
});

//admin login

const loginAdmin = asyncHandler(async (req, res) => {
  const { email,password } = req.body;
  //check if user exists
  const findAdmin = await User.findOne({email});
  if (findAdmin.role === "user") {
    throw new Error("Not Authorized")};
  if (findAdmin.role==="admin" && (await findAdmin.isPasswordMatched(password))) {
    const refreshToken = await generateRefreshToken(findAdmin?._id);
    const updateuser = await User.findOneAndUpdate(
      findAdmin.id,
      {
        refreshToken: refreshToken,
      },
      { new: true }
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000,
    });
    res.json({
      _id: findAdmin?._id,
      firstname: findAdmin?.firstname,
      lasttname: findAdmin?.lastname,
      email: findAdmin?.email,
      role:findAdmin?.role,
      token: generateToken(findAdmin?._id),
    });
  } else {
    throw new Error("Invalid Credentials");
  }
});

// handle refresh token

const handleRefreshToken=asyncHandler(async(req,res)=>{
    const cookie=req.cookies;
    if(!cookie?.refreshToken){
        throw new Error ("No refresh token in Cookies");  
    }
    const refreshToken = cookie.refreshToken;
    const user=await User.findOne({refreshToken});
    if(!user) throw new Error ("nop refresh tokens present in db or not matched");
    
    jwt.verify(refreshToken,process.env.JWT_SECRET, (err, decoded) =>{
        if(err || user.id !== decoded.id){
            throw new Error ("There is something wrong with refresh token")
        }
        const accessToken= generateToken(user?._id);
        res.json(accessToken);
    });
    
});

// logout functionality

const logout=asyncHandler(async(req,res)=>{
    const cookie = req.cookies;
    if (!cookie?.refreshToken) {
      throw new Error("No refresh token in Cookies");
    }
    const refreshToken = cookie.refreshToken;
    const user = await User.findOne({ refreshToken });
    if(!user){
        res.clearCookie('refreshToken',{
            httpOnly:true,
            secure:true,
        });
        return res.sendStatus(204);//forbidden
    }
    await User.findOneAndUpdate(refreshToken,{
        refreshToken:"",
    });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
    });
   res.sendStatus(204);// forbidden
})

//update a user

const updateaUser=asyncHandler(async(req,res)=>{
    const {_id}=req.user;
    validateMongoDbId(_id);
    try {
        const updateaUser=await User.findByIdAndUpdate(_id,{
            firstname:req?.body.firstname,
            lastname:req?.body.lastname,
        },
        {
            new:true,
        });
        res.json(updateaUser);
    } catch (error) {
        throw new Error(error);
    }
})

//save user address

const saveAddress=asyncHandler(async(req,res,next)=>{
    const { _id } = req.user;
    validateMongoDbId(_id);
     try {
       const updateaUser = await User.findByIdAndUpdate(
         _id,
         {
           address: req?.body?.address,
           
         },
         {
           new: true,
         }
       );
       res.json(updateaUser);
     } catch (error) {
       throw new Error(error);
     }
})

//get all users

const getAllUser=asyncHandler(async(req,res)=>{
    try{
        const getAllUser = await User.find();
        res.json(getAllUser);
    }
    catch(error){
        throw new Error(error);
    }
})

// get a single user

const getaUser=asyncHandler(async(req,res)=>{
    const{id}=req.params;
    validateMongoDbId(id);
    try {
        const getaUser=await User.findById(id)
        res.json({getaUser});
    } catch (error) {
        throw new Error(error)
    }
    console.log(id);
})

//delete user

const deleteaUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const deleteaUser = await User.findByIdAndDelete(id);
    res.json({ deleteaUser });
  } catch (error) {
    throw new Error(error);
  }
  console.log(id);
});

// update password

const updatePassword=asyncHandler(async(req,res)=>{
    const {_id}=req.user;
    const {password}=req.body;
    validateMongoDbId(_id);
    const user=await User.findById(_id);
    if(password){
        user.password= password;
        const updatedPassword=await user.save();
        res.json(updatedPassword);
    }
    else{
        res.json(user);
    }
})

// generate forgot password token

const forgotPasswordToken=asyncHandler(async(req,res)=>{
    const {email}=req.body;
    const user=await User.findOne({email});
    if(!user) throw new Error ('User not found with this email');
    try {
        const token = await user.createPasswordResetToken();
        await user.save();
        const resetURL=`Hi, Please follow this link to reset Your Password. This link is valid till 10 minutes from now. <a href='http:localhost:5000/api/user/reset-password/${token}'>Click Here</a>`;
        const data={
            to:email,
            subject:"Forgot Password Link",
            html:resetURL,
            text:"Hey User",
        };
        sendEmail(data);
        res.json(token);
    } catch (error) {
        throw new Error (error);
    }
})

// reset passowrd functionality

const resetPassword=asyncHandler(async(req,res)=>{
    const {password}=req.body;
    const {token}=req.params;
    const hashedToken=crypto.createHash('sha256').update(token).digest('hex');
    const user= await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires:{$gt: Date.now()},
    });
    if(!user) throw new Error ("Token Expired please try again later");
    user.password=password;
    user.passwordResetToken=undefined;
    user.passwordResetExpires=undefined;
    await user.save();
    res.json(user);

})

const getWishlist=asyncHandler(async(req,res)=>{
    const {_id}=req.user;

    try {
        const findUser=await User.findById(_id).populate('wishlist');
        res.json(findUser);
    } catch (error) {
        throw new Error (error);
    }
});

// cart functionality

const userCart =asyncHandler(async (req,res)=>{
    const { _id } = req.user;
    const {cart}=req.body;
    
    validateMongoDbId(_id)
    try {
        let products=[];
        const user = await User.findById(_id);
        //check if user already have products in cart
        const alreadyExistCart= await Cart.findOne({orderby: user._id});
        if(alreadyExistCart) {
            alreadyExistCart.remove();
        }
        for(let i=0;i < cart.length;i++){
            let object={};
            object.product=cart[i]._id;
            object.count=cart[i].count;
            let getPrice=await Product.findById(cart[i]._id).select('price').exec();
            object.price=getPrice.price;
            products.push(object);
        }
        let cartTotal=0;
        for(let i=0; i<products.length;i++){
            cartTotal=cartTotal+products[i].price * products[i].count;
        }
        
        let newCart=await new Cart({
            products,
            cartTotal,
            orderby: user?._id,
        }).save();
        res.json(newCart);
    } catch (error) {
        throw new Error(error);
    }
});

// get user cart

const getUserCart=asyncHandler(async(req,res)=>{
    const {_id}=req.user;
    validateMongoDbId(_id);
    try {
        const cart=await Cart.findOne({orderby:_id}).populate("products.product", "_id title price ");
        res.json(cart);
    } catch (error) {
        throw new Error (error);
    }
})

// empty cart functionality

const emptyCart=asyncHandler(async(req,res)=>{
      const { _id } = req.user;
      validateMongoDbId(_id);
      try {
        const user= await User.findOne({_id}); 
        const cart=await Cart.findOneAndRemove({orderby:user._id});
        res.json(cart);
      } catch (error) {
        throw new Error(error);
      }
});

//create order

const createOrder=asyncHandler(async(req,res)=>{
   const{COD}=req.body;
   const {_id}=req.user;
   validateMongoDbId(_id);
   try {
    if(!COD) throw new Error ("Create cash order failed");
    const user=await User.findById(_id);
    let userCart=await Cart.findOne({orderby:user._id});
    let finalAmount=0;
    finalAmount = userCart.cartTotal ;
    let newOrder = await new Order({
      products: userCart.products,
      paymentIntent: {
        id: uniquid(),
        method: "COD",
        ammount: finalAmount,
        status: "Cash on Delivery",
        created: Date.now(),
        currency: "usd",
      },
      orderby: user._id,
      orderStatus: "Cash on Delivery",
    }).save();

    let update=userCart.products.map((item)=>{
        return{
            updateOne:{
                filter:{_id:item.product._id},
                update:{$inc:{quantity: -item.count, sold: +item.count}},
            }
        }
    });

    const updated=await Product.bulkWrite(update, {});
    res.json({message: "success"});
    
   } catch (error) {
    throw new Error(error);
   } 
})

// get orders

const getOrders=asyncHandler(async(req,res)=>{
    const { _id } = req.user;
    validateMongoDbId(_id);
    try {
        const userorders=await Order.findOne({orderby:_id}).populate('products.product').exec();
        res.json(userorders);
    } catch (error) {
        throw new Error(error);
    }
})




module.exports = {
  loginUserCtrl,
  createUser,
  getAllUser,
  getaUser,
  deleteaUser,
  updateaUser,
  handleRefreshToken,
  logout,
  updatePassword,
  forgotPasswordToken,
  resetPassword,
  loginAdmin,
  getWishlist,
  saveAddress,
  userCart,
  getUserCart,
  emptyCart,
  createOrder,
  getOrders
};
