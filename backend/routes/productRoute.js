const express=require('express');
const router = express.Router();
const { createProduct, getProduct, getAllProducts, updateaProduct, deleteProduct, addToWishlist, uploadImages} = require('../controller/productCtrl');
const {isAdmin, authMiddleware}=require('../middlewares/authMiddleware');
const { uploadPhoto, productImgResize } = require('../middlewares/uploadimages');

router.post("/",createProduct);
router.put('/upload/:id',authMiddleware,isAdmin,uploadPhoto.array('images', 10),uploadImages);
router.get("/:id",getProduct);
router.put('/wishlist',authMiddleware,addToWishlist);
router.put("/:id",isAdmin,updateaProduct);
router.delete("/:id",isAdmin,deleteProduct);
router.get("/",getAllProducts);




module.exports=router;