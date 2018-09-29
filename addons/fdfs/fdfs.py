# -*- coding: utf-8 -*-

from odoo import models, fields
import os
from fdfs_client.client import Fdfs_client


def _get_fdfs_client():
    config_path = '/etc/fdfs/client.conf'
    client = Fdfs_client(config_path)
    return client


def _get_ext_name(file_name):
    if not file_name or file_name.strip() == '':
        return None
    exts = os.path.splitext(file_name)
    return exts[1][1:] if exts[1] else ''


class FdfsAttachment(models.Model):
    """
    使用FDFS保存附件
    """
    _inherit = "ir.attachment"

    # fdfs存储的实际路径
    fdfs_file_id = fields.Char(string='FileId')

    def _file_read(self, fname, bin_size=False):
        storage = self._storage()
        if storage == 'fdfs':
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

    def _file_write(self, value, checksum):
        storage = self._storage()
        if storage == 'fdfs':
            client = _get_fdfs_client()
            bin_value = value.decode('base64')
            ext_name = _get_ext_name(self.datas_fname)
            meta_data = {'name': self.datas_fname, 'ext_name': ext_name}
            result = client.upload_by_buffer(bin_value, ext_name, meta_data)
            fname = result['Remote file_id']
        else:
            fname = super(FdfsAttachment, self)._file_write(value, checksum)
        return fname
