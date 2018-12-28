# -*- coding: utf-8 -*-

import logging

from odoo import api, fields, models, tools, SUPERUSER_ID, _

_logger = logging.getLogger(__name__)


class FDFSAttachment(models.Model):
    """
    FDFS文件系统
    """

    _name = "fdfs.attachment"

    name = fields.Char(string=u"文件名称")
    mimetype = fields.Char(string=u"文件类型")
    url = fields.Char(string=u"文件路径")
    res_model = fields.Char(string=u"模型来源")
    res_id = fields.Char(string=u"模型ID")