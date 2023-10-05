const Product = require("../models/productModel");
const asyncHandler = require("express-async-handler");
const slugify=require('slugify');
const User = require("../models/userModel");
const validateMongoDbId=require('../utils/validateMongodb');
const cloudinaryUploadImg=require('../utils/cloudinary');
const fs=require('fs');

// create product
const createProduct = asyncHandler(async (req, res) => {
  try {
    if(req.body.title){
        req.body.slug=slugify(req.body.title);
    }
    const newProduct = await Product.create(req.body);
    res.json(newProduct);
  } catch (error) {
    throw new Error(error);
  }
});

// product update

const updateaProduct=asyncHandler(async(req,res)=>{
    const id= req.params.id;
    try {
        if(req.body.title){
            req.body.slug=slugify(req.body.title);
        }
        const updProduct=await Product.findOneAndUpdate({id}, req.body ,{
            new:true,
        });
        res.json(updProduct);
    } catch (error) {
        throw new Error(error)
    }
})

//product deletion

const deleteProduct = asyncHandler(async (req, res) => {
    console.log(req.params);
  const id = req.params.id;
  try {
    const deleteProduct = await Product.findOneAndDelete(id);
    res.json(deleteProduct);
  } catch (error) {
    throw new Error(error);
  }
});

// fetch product

const getProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const findProduct = await Product.findById(id);
    res.json(findProduct);
  } catch (error) {
    throw new Error(error);
  }
});

// fetch all product

const getAllProducts=asyncHandler(async(req,res)=>{
    try {
        //filtering
        const queryObj={...req.query};
        const excludeFields=['page','sort','limit','fields'];
        excludeFields.forEach((el)=> delete queryObj[el]);
        
        let queryStr=JSON.stringify(queryObj);
        queryStr=queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match =>`$${match}`);
        let query=Product.find(JSON.parse(queryStr));

        //sorting
        if(req.query.sort){
            const sortBy=req.query.sort.split(',').join(' ');
            query=query.sort(sortBy)
        }
        else{
            query=query.sort('-createdAt');
        }

        //limiting the field
        if(req.query.fields){
            const fields = req.query.fields.split(",").join(" ");
            query = query.select(fields);
        }else{
            query=query.select('-__v')
        }

        //pagination
        const page=req.query.page;
        const limit=req.query.limit;
        const skip=(page-1)* limit;
        query = query.skip(skip).limit(limit);
        if(req.query.page){
            const productCount=await Product.countDocuments();
            if(skip>=productCount){
                throw new Error ('This page does not exists')};
        }
        console.log(page,limit,skip);
        

        const product=await query;
        res.json(product);
    } catch (error) {
        throw new Error(error);
    }
})

// add to wishlist functionality

const addToWishlist=asyncHandler(async(req,res)=>{
    const { _id }=req.user;
    const{prodId}=req.body;
    try {
        const user=await  User.findById(_id);
        const alreadyadded= user.wishlist.find((id)=>id.toString()===prodId);
        if(alreadyadded){
            let user=await User.findByIdAndUpdate(_id,
                {
                $pull:{wishlist:prodId},
                 },
            {
                new:true,
            }
            );
            res.json(user);
        }else{
            let user = await User.findByIdAndUpdate(
              _id,
              {
                $push: { wishlist: prodId },
              },
              {
                new: true,
              }
            );
            res.json(user);
        }
    } catch (error) {
        throw new Error (error)
    }
})


const uploadImages=asyncHandler(async(req,res)=>{
    const {id}=req.params;
    validateMongoDbId(id);
    try {
        const uploader = (path) => cloudinaryUploadImg(path,'images');
        const urls=[];
        const files=req.files;
        for(const file of files){
            const {path} =file;
            const newpath=await uploader(path);
            urls.push(newpath);
            //fs.unlinkSync(path);
        }
        const findProduct=await Product.findByIdAndUpdate(id,{
            images:urls.map(file=>{
                return file;
            }),
        },
        {new:true,}
        );
        res.json(findProduct);
    } catch (error) {
        throw new Error(error)
    }
})




module.exports = { createProduct, getProduct , getAllProducts, updateaProduct, deleteProduct, addToWishlist, uploadImages};
