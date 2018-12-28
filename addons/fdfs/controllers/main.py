# -*- coding: utf-8 -*-
# Fdfs上传附件的controller
from odoo import http, _
from odoo.http import request
from odoo.exceptions import AccessError, UserError
from .. import fdfs
import mimetypes

import logging
logger = logging.getLogger(__name__)

class FdfsBackend(http.Controller):

    @http.route(['/fdfs/upload'], type='json', auth='user', methods=['POST'])
    def upload(self, *args, **post):
        """
        通过ajax请求上传附件，并返回URL地址
        """
        result = {'code':0, 'message':'', 'url':''}

        # check the size only when we upload a file.
        if post.get('datas'):
            file_size = len(post['datas']) * 3 / 4 # base64
            if (file_size / 1024.0 / 1024.0) > 25:
                result.update({'code':-1, 'message': _('File is too big. File size cannot exceed 25MB')})
                return result

        content = post.get('datas')
        meta_data = dict((fname, post[fname]) for fname in ['filename', 'size', 'type'] if post.get(fname))
        # minetype = mimetypes.read_mime_types(content)
        try:
            url = fdfs.upload_to_fdfs(content, meta_data['filename'], meta_data)
            # windows环境返回的链接是反斜杠，需要替换一下，group0\M00/...
            url = url.replace('\\','/')
            fdfs_server = request.env['ir.config_parameter'].sudo().get_param('fdfs.server', '')
            if fdfs_server:
                url = fdfs_server + url
        except (UserError, AccessError) as e:
            logger.error(e)
            result.update({'code':-1, 'message': e.name})
            return result
        except Exception as e:
            logger.error(e)
            result.update({'code':-1, 'message': _('Internal server error, please try again later or contact administrator.\nHere is the error message: %s') % e.message})
            return result
        if post.get('many',False):
            # x2many字段
            file_name = meta_data['filename']
            # 暂时取文件后缀
            file_mimetype = file_name.split('.')[-1]
            att_record = request.env["fdfs.attachment"].sudo().create({
                'name': meta_data['filename'],
                'url': url,
                'mimetype': file_mimetype,
            })
            result.update({'code':0,
                           'message':'',
                           'url': url,
                           'id':att_record.id,
                           'name': file_name,
                           'mimetype': file_mimetype
                           })
        else:
            result.update({'code':0, 'message':'', 'url': url})
        # logger.info(result)
        return result