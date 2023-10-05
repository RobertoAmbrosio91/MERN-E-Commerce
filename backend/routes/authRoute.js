const express=require("express");
const { createUser, loginUserCtrl, getAllUser,getaUser, deleteaUser, updateaUser, handleRefreshToken, logout, updatePassword, forgotPasswordToken, resetPassword, loginAdmin, getWishlist, saveAddress, userCart, getUserCart, emptyCart, createOrder, getOrders } = require("../controller/userCtrl");
const {authMiddleware,isAdmin} = require("../middlewares/authMiddleware");
const router=express.Router();


router.post('/register',createUser);
router.post('/forgot-password-token',forgotPasswordToken);
router.put('/reset-password/:token',resetPassword);
router.put('/password',authMiddleware,updatePassword);
router.post('/login',loginUserCtrl);
router.post('/admin-login',loginAdmin);
router.post('/cart',authMiddleware, userCart);
router.post('/cart/cash-order',authMiddleware,createOrder);
router.get("/orders",authMiddleware, getOrders);

router.get('/all-users',getAllUser);
router.get("/refresh", handleRefreshToken);
router.get('/logout', logout)
router.get("/wishlist", authMiddleware, getWishlist);
router.get("/cart", authMiddleware, getUserCart);
router.delete("/empty-cart",authMiddleware,emptyCart);
router.get('/:id',authMiddleware,isAdmin,getaUser);

router.delete('/:id',deleteaUser);
router.put('/edit-user',authMiddleware,updateaUser);
router.put('/save-address',authMiddleware,saveAddress);

module.exports=router;