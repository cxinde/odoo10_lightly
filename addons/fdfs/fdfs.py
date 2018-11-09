# -*- coding: utf-8 -*-

from odoo import models, fields, api
import os
from fdfs_client.client import Fdfs_client

MIME_TYPE_EXT_NAME = {
    'application/msword': 'docx',
    'application/vnd.ms-excel': 'xlsx',
    'application/vnd.ms-powerpoint': 'pptx',
    'image/jpeg': 'jpeg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    'application/pdf': 'pdf',
    'application/zip': 'zip',
}


def _get_fdfs_client():
    #config_path = '/etc/fdfs/client.conf'
    config_path = '/Users/tedi/workspace/pythonproject/odoo_alls/wxhf/odoo10_dev_lightly/client.conf'
    client = Fdfs_client(config_path)
    return client


def _guess_ext_name_from_mimetype(mimetype):
    if not mimetype:
        return  None
    return MIME_TYPE_EXT_NAME.get(mimetype, None)


def _get_ext_name(file_name, mime_type=None):
    ext_name = None
    if file_name:
        exts = os.path.splitext(file_name)
        ext_name = exts[1][1:] if exts[1] else ''
    if not ext_name:
        ext_name = _guess_ext_name_from_mimetype(mime_type)
    return ext_name

def upload_to_fdfs(content, filename, meta_data=None):
    """
    上传文件到fdfs服务器，并返回file_id地地
    @param content 上传的文件内容
    @param filename 原始文件的名称
    @param meta_data 原数据
    """
    client = _get_fdfs_client()
    bin_value = content.decode('base64')
    ext_name = _get_ext_name(filename)
    meta_data = {} if meta_data is None else meta_data
    meta_data.update({'name': filename, 'ext_name': ext_name})
    result = client.upload_by_buffer(bin_value, ext_name, meta_data)
    return result['Remote file_id']

class FdfsAttachment(models.Model):
    """
    使用FDFS保存附件
    """
    _inherit = "ir.attachment"

    # fdfs存储的实际路径
    fdfs_file_id = fields.Char(string='FileId')

    @api.model
    def _file_read(self, fname, bin_size=False):
        storage = self._storage()
        if storage == 'fdfs' and fname.startswith('group'):
            client = _get_fdfs_client()
            if not fname:
                return None
            try:
                read = client.download_to_buffer(fname)
                if read and read.has_key('Content'):
                    read = read['Content'].encode('base64')
                else:
                    raise
            except Exception, ex:
                read = super(FdfsAttachment, self)._file_read(fname, bin_size=False)
            return read
        else:
            read = super(FdfsAttachment,self)._file_read(fname, bin_size=False)
        return read

    @api.model
    def _file_write(self, value, checksum):
        storage = self._storage()
        if storage == 'fdfs':
            fname = upload_to_fdfs(value, self.datas_fname) 
        else:
            fname = super(FdfsAttachment, self)._file_write(value, checksum)
        return fname
