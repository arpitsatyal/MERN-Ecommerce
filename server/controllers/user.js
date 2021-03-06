import User from "../models/User";
import Product from "../models/Product";
import Cart from "../models/Cart";
import Coupon from '../models/Coupon';
import Order from '../models/Order';
const { v4: uuidv4 } = require('uuid');

export const userCart = async (req, res, next) => {
  try {
    const { cart } = req.body;
    const products = [];
    let cartTotal = 0;
    const user = await User.findOne({ email: req.user.email });

    //check if cart with logged in user already exists
    const cartExistsByUser = await Cart.findOne({ orderedBy: user._id });
    if (cartExistsByUser) {
      await cartExistsByUser.remove();
    }

    for (let i = 0; i < cart.length; i++) {
      const obj = {};
      obj.product = cart[i]._id;
      obj.count = cart[i].count;
      obj.color = cart[i].color;
      const { price } = await Product.findById(cart[i]._id)
      .select("price");
      obj.price = price;
      products.push(obj);
    }

    cartTotal = products.reduce(
      (acc, product) => (acc += product.price * product.count),
      0
    );

    //save to db finally
    await new Cart({
      products,
      cartTotal,
      orderedBy: user._id,
    }).save();

    res.json({ ok: true });
  } catch (e) {
    next({ msg: e });
  }
};

export const getUserCart = async (req, res, next) => {
    try {
        const user = await User.findOne({ email:  req.user.email });
        const cart = await Cart.findOne({ orderedBy: user._id })
        .populate('products.product', '_id title price totalAfterDiscount');
        const { products, cartTotal } = cart;
        res.json({ products, cartTotal });
    } catch (e) {
        next({ msg: e });
    }
}

export const emptyUserCart = async (req, res, next) => {
  try {
      const user = await User.findOne({ email:  req.user.email });
     await Cart.findOneAndRemove({ orderedBy: user._id });
      res.json({ ok: true });
  } catch (e) {
      next({ msg: e });
  }
}

export const saveAddress = async (req, res, next) => {
  try {
    await User.findOneAndUpdate({ email: req.user.email }, {
        address: req.body.address
      }, { new: true })
      res.json({ ok: true });
  } catch (e) {
      next({ msg: e });
  }
}

export const applyCoupon = async(req, res, next) => {
  const { coupon } = req.body;
  try {
    const validCoupon = await Coupon.findOne({ name: coupon });
    if(!validCoupon) {
      return next({ msg: 'Invalid Coupon!' });
    }
    //now discount from the cart.
    const user = await User.findOne({ email: req.user.email });

    const { cartTotal } = await Cart
    .findOne({ orderedBy: user._id })
    .populate('products.product', '_id title price');

    const totalAfterDiscount =
     (cartTotal - (cartTotal * validCoupon.discount) /100).toFixed(2);

     await Cart.
     findOneAndUpdate({ orderedBy: user._id }, 
      { totalAfterDiscount },
      { new: true });

      res.json(totalAfterDiscount);

  } catch (e) {
      next({ msg: e });
  } 
}


export const createOrder = async (req, res, next) => {
    const { paymentIntent } = req.body.stripeResponse;
  const user = await User.findOne({ email: req.user.email });
  const { products } = await Cart.findOne({ orderedBy: user._id });

  try {
      await Order.create({
          products,
          paymentIntent,
          orderedBy: user._id
      })
      //decrement quantity, increment sold
      const bulkOption = products.map(item => {
        return {
          updateOne: {
            filter: { _id: item.product._id },
            update: { $inc: { quantity: -item.count, sold: +item.count }}
          }
        }
      })
      await Product.bulkWrite(bulkOption, {});
      res.status(200).json({ ok: true });
  } catch (e) {
      if(e.code === 11000) return next({ msg: 'duplicate order..'})
      next({ msg: e })
  }
}

export const getOrders = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    const userOrders = await Order.find({ orderedBy: user._id })
    .populate('products.product')
    .sort('-createdAt')
      res.json(userOrders);
  } catch (e) {
      next({ msg: e });
  }
}

export const addToWishlist = async (req, res, next) => {
  try {
   await User.findOneAndUpdate({ email: req.user.email }, {
      $addToSet: { wishlist: req.body.productId }
    }, {new: true});
      res.json({ ok: true });
  } catch (e) {
      next({ msg: e });
  }
}

export const getWishlist = async (req, res, next) => {
  try {
    const list = await User.findOne({ email: req.user.email })
    .select('wishlist')
    .populate('wishlist')
      res.json(list);
  } catch (e) {
      next({ msg: e });
  }
}

export const removeFromWishlist = async (req, res, next) => {
  try {
   await User.findOneAndUpdate({ email: req.user.email }, {
      $pull: {
        wishlist: req.params.productId
      }
    });
      res.json({ new: true });
  } catch (e) {
      next({ msg: e });
  }
}

export const createCashOrder = async (req, res, next) => {
  const { cod, couponApplied } = req.body;
  if(!cod) return next({ msg: 'create cash order failed :(' })
  //if cod is true, create order with status of cash on delivery
const user = await User.findOne({ email: req.user.email });
const { products, cartTotal, totalAfterDiscount } = await Cart.findOne({ orderedBy: user._id });
let finalPrice = 0;
    couponApplied ?
     finalPrice = parseInt(totalAfterDiscount) * 100 
     : finalPrice = parseInt(cartTotal) * 100
try {
    await Order.create({
        products,
        paymentIntent:  {
          id: uuidv4(),
          amount: finalPrice,
          currency: 'usd',
          status: 'Cash On Delivery',
          created: Date.now(),
          payment_method_types: ['cash']
        },
        orderedBy: user._id,
        orderStatus: 'Cash On Delivery'
    })
    //decrement quantity, increment sold
    const bulkOption = products.map(item => {
      return {
        updateOne: {
          filter: { _id: item.product._id },
          update: { $inc: { quantity: -item.count, sold: +item.count }}
        }
      }
    })

    await Product.bulkWrite(bulkOption, {});
    res.status(200).json({ ok: true });
} catch (e) {
    if(e.code === 11000) return next({ msg: 'duplicate order..'})
    next({ msg: e })
}
}
