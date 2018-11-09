# -*- encoding: utf-8 -*-
##############################################################################
#
#    OpenERP, Open Source Management Solution
#    Copyright (C) 2016 Smile (<http://www.tedi3231.me>). All Rights Reserved
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU General Public License as published by
#    the Free Software Foundation, either version 3 of the License, or
#    (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU General Public License for more details.
#
#    You should have received a copy of the GNU General Public License
#    along with this program.  If not, see <http://www.tedi3231.me/>.
#
##############################################################################

{
    "name": "Use fast fdfs Store attachment",
    "version": "0.1",
    "depends": ["web"],
    "author": "tedi3231@qq.com",
    "license": 'AGPL-3',
    "description": """Use fast fdfs to save attachment

    Suggestions & Feedback to: tedi3231@qq.com
    """,
    "summary": "",
    "website": "http://www.hrtopone.cn",
    "category": 'Tools',
    "auto_install": False,
    "installable": True,
    "application": False,
    'data': [
        'views/fdfs_templates.xml',
    ],
    'qweb': [
        'static/src/xml/widget.xml',
    ],
    "external_dependencies": {
        'python': ['fdfs_client'],
    },
}
