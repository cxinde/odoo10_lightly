# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import api, models, fields

class Product(models.Model):
    _name = 'fdfs_demo.product'

    name = fields.Char(string='Name', required=True)
    pic_url = fields.Char(string='PicUrl')