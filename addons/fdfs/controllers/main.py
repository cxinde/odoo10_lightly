# -*- coding: utf-8 -*-
# Fdfs上传附件的controller
from odoo import http, _
from odoo.http import request
from odoo.exceptions import AccessError, UserError
from .. import fdfs

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
        try:
            url = fdfs.upload_to_fdfs(content, meta_data['filename'], meta_data)
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
        result.update({'code':0, 'message':'', 'url': url})
        #logger.log(result)
        return result