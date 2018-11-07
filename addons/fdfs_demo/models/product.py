# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import api, models, fields

class Product(models.Model):
    _name = 'fdfs_demo.product'

    name = fields.Char(string='Name', required=True)
    pic_url = fields.Char(string='PicUrl')
    line_ids = fields.One2many('fdfs_demo.product.line', 'product_id', string='Lines')

    
class ProductLine(models.Model):
    _name = 'fdfs_demo.product.line'

    product_id = fields.Many2one('fdfs_demo.product', string='Product', required=True)
    name = fields.Char(string='Line')
    url = fields.Char(string='URL')