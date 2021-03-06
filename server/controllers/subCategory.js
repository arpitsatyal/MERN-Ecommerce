import SubCategory from '../models/SubCategory'
import slugify from 'slugify'
import Product from '../models/Product'

export const create = async (req, res, next) => {
    let { name, parent } = req.body
    try {
        let subCategory = await SubCategory.create({
            name,
            parent,
            slug: slugify(name)
        })
        res.status(200).json(subCategory)
    } catch (e) {
        if(e.code === 11000) return next({ msg: 'duplicate sub Category.'})
        next({ msg: e })
    }
}

export const list = async (req, res, next) => {
    try {
        res.json(
            await SubCategory.find()
            .sort({ createdAt: -1 })
        )
    } catch (e) {
        next({ msg: e })
    }
}

export const read = async (req, res, next) => {
    try {
        let subCategory = await SubCategory
        .findOne({ slug: req.params.slug })
        if(!subCategory) return next({ msg: 'no such sub category found.', status: 404 })
        const products = await Product.find({ subs: subCategory._id })
        .populate('subs')
        res.json({ subCategory, products })
    } catch (e) {
        next({ msg: e })
    }
}

export const update = async (req, res, next) => {
    let { name, parent } = req.body
    try {
      let sub = await SubCategory.findOneAndUpdate({ slug: req.params.slug, parent }, { name, slug: slugify(name) }, {
          new: true
      })
      if(!sub) next({ msg: 'cannot update sub of a different category.', status: 400 })
      res.json(sub)
    } catch (e) {
        next({ msg: e })
    }
}

export const remove = async (req, res, next) => {
    try {
        res.status(204).json(
            await SubCategory
            .findOneAndDelete({ slug: req.params.slug })
        )
    } catch (e) {
        next({ msg: e })
    }
}

